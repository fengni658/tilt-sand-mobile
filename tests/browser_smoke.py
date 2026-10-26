"""Run against npm run preview. Browser simulation, NOT physical sensor validation."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('TEST_URL','http://localhost:4173')
out=Path('artifacts');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base);page.wait_for_timeout(1400)
 assert page.locator('canvas').count()==1
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(out/'mobile.png'),full_page=True)
 page.locator('#pause').click();assert page.locator('#pause').get_attribute('aria-pressed')=='true'
 image1=page.locator('canvas').evaluate('(c)=>c.toDataURL()');page.wait_for_timeout(200);assert image1==page.locator('canvas').evaluate('(c)=>c.toDataURL()')
 page.locator('#reset').click();assert page.locator('#pause').get_attribute('aria-pressed')=='true'
 page.locator('#pause').click();page.locator('#touch').click()
 canvas=page.locator('canvas');box=canvas.bounding_box()
 page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.mouse.move(box['x']+5,box['y']+box['height']/2);page.mouse.up();page.wait_for_timeout(1800)
 assert '90' in page.locator('#direction').get_attribute('style')
 page.screenshot(path=str(out/'mobile-left-gravity.png'),full_page=True)
 page.locator('#palette').select_option('ocean');page.locator('#calibrate').click()
 page.evaluate("Object.defineProperty(window,'DeviceOrientationEvent',{configurable:true,value:class {static async requestPermission(){return 'denied'}}})")
 page.locator('#sensor').click();assert '未获允许' in page.locator('#status').inner_text()
 # Repeat enable, simulate permission granted and an orientation sample.
 page.evaluate("Object.defineProperty(window,'DeviceOrientationEvent',{configurable:true,value:class {static async requestPermission(){return 'granted'}}})")
 page.locator('#sensor').click()
 page.evaluate("(()=>{const e=new Event('deviceorientation');Object.assign(e,{beta:45,gamma:20});dispatchEvent(e)})()")
 assert '倾斜已连接' in page.locator('#status').inner_text()
 page.locator('#calibrate').click();assert '零重力' in page.locator('#status').inner_text()
 page.locator('#touch').click()
 page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(200);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/'landscape.png'),full_page=True)
 page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller!==null')
 context.set_offline(True);page.reload();page.wait_for_timeout(300);assert page.locator('canvas').count()==1;page.locator('#pause').click();assert page.locator('#pause').get_attribute('aria-pressed')=='true'
 assert not errors,errors
 result={'passed':['390px mobile layout','pause freeze and resume','reset preserves pause','drag gravity','palette switch','calibration','sensor denial fallback','simulated granted sensor','844px landscape','offline reload and interaction'],'pageErrors':errors,'physicalDeviceValidated':False}
 (out/'browser-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));browser.close()
