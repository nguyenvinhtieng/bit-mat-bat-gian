import { create } from 'zustand';
import type { Room } from 'colyseus.js';
import { voiceGain, type VoiceSignal } from '@hidden-truth/shared';
import { httpBase, onRoom, send } from './net';
import { useStore } from './store';

/**
 * Proximity voice chat: a WebRTC mesh (one audio connection per other player), the game server
 * only relays the handshake (`voice:signal`). Each listener mixes the volume of every speaker
 * itself from the game state — see voiceGain() in shared/voice.ts.
 *
 * Who offers: a client that (re)joins a room offers to everyone already there; players who arrive
 * later offer to it. Two offers crossing each other (glare): the lower session id keeps its own.
 */

/** STUN fallback; loadIce() swaps in the server's list, which adds our TURN relay with short-lived credentials */
let ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
let iceExpires = 0;
let iceLoading: Promise<void> | null = null;
function loadIce(): Promise<void> {
  if (Date.now() < iceExpires) return Promise.resolve();
  // bounded: connections wait on this, a hung server must not stall voice (falls back to STUN)
  iceLoading ??= fetch(`${httpBase()}/ice`, { signal: AbortSignal.timeout(4000) })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j: { iceServers?: RTCIceServer[]; ttl?: number }) => {
      if (j.iceServers?.length) ICE = j.iceServers;
      // refresh well before the credentials run out
      iceExpires = Date.now() + (j.ttl ?? 3600) * 500;
    })
    .catch(() => {})
    .finally(() => {
      iceLoading = null;
    });
  return iceLoading;
}
const SPEAKER_KEY = 'tht:speaker';
const TICK_MS = 100;

function loadSpeaker() {
  try {
    return localStorage.getItem(SPEAKER_KEY) !== '0';
  } catch {
    return true;
  }
}

export const useVoice = create<{ mic: boolean; micBusy: boolean; speaker: boolean }>(() => ({
  mic: false,
  micBusy: false,
  speaker: loadSpeaker(),
}));

/** GameScene answers "where is this speaker for me" (distance, line of sight, current sight radius) */
export type VoiceProbe = (id: string) => { dist: number; seen: boolean; radius: number } | null;
let probe: VoiceProbe | null = null;
export function setVoiceProbe(p: VoiceProbe | null) {
  probe = p;
}

type Peer = { pc: RTCPeerConnection; el?: HTMLAudioElement; vol: number; pendingIce: RTCIceCandidateInit[] };
const peers = new Map<string, Peer>();
/** players whose connection failed: retry (lower id offers) once the time passes */
const retryAt = new Map<string, number>();
let room: Room | null = null;
let myId = '';
/** first room snapshot after joining: offer to everyone already there */
let fresh = false;
let micStream: MediaStream | null = null;

const micTrack = () => micStream?.getAudioTracks()[0] ?? null;

function drop(id: string) {
  const p = peers.get(id);
  if (!p) return;
  peers.delete(id);
  p.pc.onicecandidate = p.pc.ontrack = p.pc.onconnectionstatechange = null;
  p.pc.close();
  if (p.el) {
    p.el.pause();
    p.el.srcObject = null;
  }
}

function makePeer(id: string): Peer {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  const peer: Peer = { pc, vol: 0, pendingIce: [] };
  pc.onicecandidate = (e) => {
    if (e.candidate) send('voice:signal', { to: id, data: { ice: e.candidate.toJSON() as RTCIceCandidateInit & { candidate: string } } });
  };
  pc.ontrack = (e) => {
    const el = peer.el ?? new Audio();
    el.autoplay = true;
    el.volume = 0;
    el.srcObject = e.streams[0] ?? new MediaStream([e.track]);
    peer.el = el;
    el.play().catch(() => {}); // blocked until a user gesture -> unlock() retries
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState !== 'failed' || peers.get(id) !== peer) return;
    drop(id);
    retryAt.set(id, Date.now() + 2000);
  };
  peers.set(id, peer);
  return peer;
}

async function offer(id: string) {
  drop(id);
  const { pc } = makePeer(id);
  const tr = pc.addTransceiver('audio', { direction: 'sendrecv' });
  await tr.sender.replaceTrack(micTrack());
  await pc.setLocalDescription(await pc.createOffer());
  const d = pc.localDescription;
  if (d && peers.get(id)?.pc === pc) send('voice:signal', { to: id, data: { sdp: { type: 'offer', sdp: d.sdp } } });
}

async function flushIce(p: Peer) {
  for (const c of p.pendingIce.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
}

async function onSignal({ from, data }: { from: string; data: VoiceSignal }) {
  try {
    if ('sdp' in data) {
      if (data.sdp.type === 'offer') {
        await loadIce(); // answer with the TURN relay too, not just the STUN fallback
        if (!room) return;
        const cur = peers.get(from);
        // glare: both offered at once -> the lower id keeps its own offer
        if (cur?.pc.signalingState === 'have-local-offer' && myId < from) return;
        drop(from); // a new offer = the other side (re)started
        const p = makePeer(from);
        await p.pc.setRemoteDescription(data.sdp);
        const tr = p.pc.getTransceivers()[0];
        if (tr) {
          tr.direction = 'sendrecv';
          await tr.sender.replaceTrack(micTrack());
        }
        await p.pc.setLocalDescription(await p.pc.createAnswer());
        const d = p.pc.localDescription;
        if (d) send('voice:signal', { to: from, data: { sdp: { type: 'answer', sdp: d.sdp } } });
        await flushIce(p);
      } else {
        const p = peers.get(from);
        if (!p || p.pc.signalingState !== 'have-local-offer') return;
        await p.pc.setRemoteDescription(data.sdp);
        await flushIce(p);
      }
    } else if ('ice' in data) {
      const p = peers.get(from);
      if (!p) return;
      if (p.pc.remoteDescription) await p.pc.addIceCandidate(data.ice).catch(() => {});
      else p.pendingIce.push(data.ice);
    }
  } catch (e) {
    console.warn('[voice] signal', e);
  }
}

/** open/close connections to match who is in the room */
function sync() {
  const r = useStore.getState().room;
  if (!room || !r) return;
  const others = r.players.filter((p) => p.id !== myId && p.connected);
  const ids = new Set(others.map((p) => p.id));
  for (const id of [...peers.keys()]) if (!ids.has(id)) drop(id);
  for (const id of [...retryAt.keys()]) if (!ids.has(id)) retryAt.delete(id);
  const now = Date.now();
  for (const p of others) {
    if (peers.has(p.id)) continue;
    const due = retryAt.get(p.id);
    if (fresh || (due !== undefined && now >= due && myId < p.id)) {
      retryAt.delete(p.id);
      offer(p.id).catch((e) => console.warn('[voice] offer', e));
    }
  }
  fresh = false;
}

/** per-speaker volume from the game state (smoothed) */
function mix() {
  const st = useStore.getState();
  const r = st.room;
  if (!r) return;
  const speaker = useVoice.getState().speaker;
  const me = r.players.find((p) => p.id === myId);
  for (const [id, peer] of peers) {
    if (!peer.el) continue;
    const other = r.players.find((p) => p.id === id);
    let goal = 0;
    if (speaker && other?.connected) {
      const at = probe?.(id) ?? { dist: Infinity, seen: false, radius: 0 };
      goal = voiceGain({ phase: r.phase, meAlive: me?.alive ?? true, otherAlive: other.alive, ...at });
    }
    peer.vol += (goal - peer.vol) * 0.5;
    if (Math.abs(goal - peer.vol) < 0.01) peer.vol = goal;
    peer.el.volume = Math.max(0, Math.min(1, peer.vol));
    // iOS ignores .volume -> at least keep out-of-range voices silent there
    peer.el.muted = peer.vol < 0.02;
  }
}

/** autoplay policy: (re)start remote audio on the first user gesture */
function unlock() {
  for (const p of peers.values()) if (p.el?.paused) p.el.play().catch(() => {});
}

function stopMic() {
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
}

function setTrack(track: MediaStreamTrack | null) {
  for (const p of peers.values()) p.pc.getTransceivers()[0]?.sender.replaceTrack(track).catch(() => {});
}

export async function toggleMic() {
  unlock();
  const v = useVoice.getState();
  if (v.micBusy) return;
  if (v.mic) {
    stopMic();
    setTrack(null);
    useVoice.setState({ mic: false });
    send('voice:mic', { on: false });
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    useStore.getState().toast({ text: 'Trình duyệt không hỗ trợ micro (cần HTTPS).', kind: 'warn' });
    return;
  }
  useVoice.setState({ micBusy: true });
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (!room) return stopMic(); // left the room while the permission prompt was up
    setTrack(micTrack());
    useVoice.setState({ mic: true });
    send('voice:mic', { on: true });
  } catch {
    useStore.getState().toast({ text: 'Không mở được micro — hãy cho phép trình duyệt dùng micro.', kind: 'warn' });
  } finally {
    useVoice.setState({ micBusy: false });
  }
}

export function toggleSpeaker() {
  unlock();
  const speaker = !useVoice.getState().speaker;
  useVoice.setState({ speaker });
  try {
    localStorage.setItem(SPEAKER_KEY, speaker ? '1' : '0');
  } catch {
    /* private mode */
  }
}

function teardown() {
  for (const id of [...peers.keys()]) drop(id);
  retryAt.clear();
  stopMic();
  useVoice.setState({ mic: false, micBusy: false });
  room = null;
}

let started = false;
/** wire voice chat to every room we join (call once at startup) */
export function initVoice() {
  if (started || typeof RTCPeerConnection === 'undefined') return;
  started = true;
  void loadIce();
  onRoom(async (r) => {
    teardown();
    room = r;
    myId = r.sessionId;
    r.send('voice:mic', { on: false }); // a resumed seat may still say "mic on"
    // one at a time, in order: an offer may wait on loadIce() and its ICE candidates must not overtake it
    let signals = Promise.resolve();
    r.onMessage('voice:signal', (m: { from: string; data: VoiceSignal }) => {
      signals = signals.then(() => onSignal(m));
    });
    r.onLeave(() => {
      if (room === r) teardown();
    });
    // build the first connections with the TURN relay already in hand (credentials may also have expired)
    await loadIce();
    if (room !== r) return;
    fresh = true;
    sync();
  });
  useStore.subscribe((s, prev) => {
    if (s.room !== prev.room) sync();
  });
  setInterval(() => {
    sync();
    mix();
  }, TICK_MS);
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
}
