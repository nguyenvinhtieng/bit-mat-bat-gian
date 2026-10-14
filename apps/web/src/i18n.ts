import { create } from 'zustand';

export type Lang = 'vi' | 'en';
const KEY = 'tht:lang';

const dict = {
  vi: {
    tagline: 'Hồ Sơ Việt Nam · trốn chạy & nhiệm vụ văn hoá · tìm ra kẻ sát nhân',
    displayName: 'Tên hiển thị',
    namePlaceholder: 'Ví dụ: Minh',
    mapTitle: 'Map: Cố đô Huế — Đêm Hội Hoàng Cung',
    mapHook: 'Làm nhiệm vụ văn hoá Huế, tránh Hắc Ảnh — hoặc trà trộn và hạ gục cả đoàn!',
    createRoom: 'Tạo phòng mới',
    roomCodePh: 'MÃ PHÒNG',
    joinRoom: 'Vào phòng',
    connecting: 'Đang kết nối…',
    chooseMap: 'Chọn bản đồ',
    comingSoon: 'Sắp ra mắt',
    comingSoonToast: 'Bản đồ này sắp ra mắt — hãy chơi Cố đô Huế trước nhé!',
    playersShort: 'người',
    controls: 'Điều khiển: WASD / mũi tên để đi · E/Space tương tác · K hạ gục (Hắc Ảnh) · R báo cáo thi thể.',
    roomCode: 'Mã phòng',
    copyLink: 'Copy link mời',
    linkCopied: 'Đã copy link mời!',
    players: 'Người chơi',
    ready: 'sẵn sàng',
    unready: 'Huỷ sẵn sàng',
    readyBtn: 'Sẵn sàng',
    leave: 'Rời phòng',
    hint: 'Gợi ý 4–10 người (có 1–2 Hắc Ảnh). Có thể bắt đầu với ít người để chơi thử.',
    quick: 'Chế độ nhanh (ít nhiệm vụ, hồi chiêu ngắn)',
    start: 'Bắt đầu ván',
    progress: 'Tiến độ nhiệm vụ',
    roleGoal: 'Vai & mục tiêu',
    used: ' (đã dùng)',
    ping: 'Ping',
    killerFaction: 'Phe Hắc Ảnh',
    crewFaction: 'Phe Người Dân',
    ghost: 'Hồn ma — vẫn làm được nhiệm vụ',
    shieldOn: 'Còn lá chắn',
    shieldOff: 'Lá chắn đã dùng',
    mates: 'Đồng bọn',
    myTasks: 'Nhiệm vụ của bạn',
    map: 'Bản đồ',
    tasksToggle: 'Nhiệm vụ',
    fakeTasks: 'Nhiệm vụ (làm để ngụy trang, vẫn tính vào tiến độ chung)',
    kill: 'Hạ gục',
    report: 'Báo cáo',
  },
  en: {
    tagline: 'Vietnam Files · run, do cultural tasks, find the killer',
    displayName: 'Display name',
    namePlaceholder: 'e.g. Minh',
    mapTitle: 'Map: Imperial City of Huế — Royal Lantern Night',
    mapHook: 'Do Huế-culture tasks and avoid the Shadow — or blend in and take everyone down!',
    createRoom: 'Create room',
    roomCodePh: 'ROOM CODE',
    joinRoom: 'Join room',
    connecting: 'Connecting…',
    chooseMap: 'Choose a map',
    comingSoon: 'Coming soon',
    comingSoonToast: 'This map is coming soon — try the Imperial City of Huế first!',
    playersShort: 'players',
    controls: 'Controls: WASD / arrows to move · E/Space interact · K kill (Shadow) · R report a body.',
    roomCode: 'Room code',
    copyLink: 'Copy invite link',
    linkCopied: 'Invite link copied!',
    players: 'Players',
    ready: 'ready',
    unready: 'Not ready',
    readyBtn: 'Ready',
    leave: 'Leave room',
    hint: 'Recommended 4–10 players (1–2 Shadows). You can start with fewer to test.',
    quick: 'Quick mode (fewer tasks, shorter cooldowns)',
    start: 'Start game',
    progress: 'Task progress',
    roleGoal: 'Role & goal',
    used: ' (used)',
    ping: 'Ping',
    killerFaction: 'Shadow faction',
    crewFaction: 'Villager faction',
    ghost: 'Ghost — you can still do tasks',
    shieldOn: 'Shield ready',
    shieldOff: 'Shield used',
    mates: 'Partners',
    myTasks: 'Your tasks',
    map: 'Map',
    tasksToggle: 'Tasks',
    fakeTasks: 'Tasks (do them to blend in; they count toward progress)',
    kill: 'Kill',
    report: 'Report',
  },
} as const;

export type TKey = keyof (typeof dict)['vi'];

const initial = (): Lang => {
  const saved = localStorage.getItem(KEY);
  if (saved === 'vi' || saved === 'en') return saved;
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
};

export const useLang = create<{ lang: Lang; setLang: (l: Lang) => void }>((set) => ({
  lang: initial(),
  setLang: (lang) => {
    localStorage.setItem(KEY, lang);
    set({ lang });
  },
}));

/** Hook returning a translate function; re-renders on language change. */
export function useT() {
  const lang = useLang((s) => s.lang);
  return (k: TKey) => dict[lang][k];
}
