import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results=[];
for (const [name,width,height] of [['desktop',1440,900],['mobile',390,844],['landscape',844,390]]) {
 const page=await browser.newPage({viewport:{width,height},locale:'vi-VN'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('tht:lang','vi'));
 await page.goto('http://localhost:5173');await page.locator('.home-card').waitFor();await page.waitForTimeout(900);
 const inspect=async(stage)=>{await page.waitForTimeout(500);const metrics=await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,dialogs:[...document.querySelectorAll('[role="dialog"]')].map(e=>{const r=e.getBoundingClientRect();return{class:e.className,x:r.x,y:r.y,width:r.width,height:r.height,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight};})}));results.push({name,stage,...metrics});await page.screenshot({path:`output/saigon-ui-qa/${name}-${stage}.png`});};
 await inspect('home');await page.locator('.hud-settings').click();await page.locator('.saigon-settings').waitFor();await inspect('settings');
 const slider=page.locator('input[type="range"]');await slider.fill('0');if(await slider.inputValue()!=='0')throw Error('mute failed');await slider.fill('65');if(await slider.inputValue()!=='65')throw Error('volume failed');
 await page.getByRole('radio',{name:'EN',exact:true}).click();if(await page.locator('.saigon-settings h3').innerText()!=='Settings')throw Error('English failed');await page.getByRole('radio',{name:'VI',exact:true}).click();
 await page.locator('.settings-guide').click();await page.locator('.saigon-guide').waitFor();await inspect('story');await page.getByRole('tab',{name:'Vai trò',exact:true}).click();await inspect('roles');await page.locator('.guide-close').click();await page.locator('.settings-x button').click();
 results.push({name,interactions:'pass',errors});await page.close();
}
console.log(JSON.stringify(results,null,2));await browser.close();
