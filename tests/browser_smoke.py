"""Run against npm run preview. Browser simulation, NOT physical sensor validation."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
base=os.environ.get('TEST_URL','http://localhost:4173')
out=Path('artifacts');out.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 page=context.new_page();errors=[];console_errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda message:console_errors.append(message.text) if message.type=='error' else None)
 page.goto(base);page.wait_for_timeout(1400)
 assert page.locator('canvas').count()==1
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(out/'mobile.png'),full_page=True)
 page.locator('#pause').click();assert page.locator('#pause').get_attribute('aria-pressed')=='true'
 image1=page.locator('canvas').evaluate('(c)=>c.toDataURL()');page.wait_for_timeout(200);assert image1==page.locator('canvas').evaluate('(c)=>c.toDataURL()')
 page.locator('#reset').click();assert page.locator('#pause').get_attribute('aria-pressed')=='true'
 page.locator('#pause').click();page.locator('#touch').click()
 canvas=page.locator('canvas')
 # Use Chromium's trusted touch input path, not mouse or JS PointerEvent dispatch.
 # This still simulates a browser; it is not a physical Android touchscreen test.
 cdp=context.new_cdp_session(page)
 page.evaluate('window.__touchEvents=[];document.querySelector("canvas").addEventListener("pointerdown",e=>window.__touchEvents.push({type:e.pointerType,trusted:e.isTrusted}))')
 def touch_drag_left():
  canvas.evaluate('(c)=>c.scrollIntoView({block:"center"})');page.wait_for_timeout(80)
  box=canvas.bounding_box();x=box['x']+box['width']/2;y=box['y']+box['height']/2
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':box['x']+5,'y':y}]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  page.wait_for_timeout(150)
 touch_drag_left();page.wait_for_timeout(1800)
 assert page.evaluate('window.__touchEvents.some(e=>e.type==="touch" && e.trusted)')
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
 layout_results=[]
 for width,height in [(640,360),(844,390),(390,844),(360,640)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'horizontal overflow {width}x{height}'
  canvas.evaluate('(c)=>c.scrollIntoView({block:"center"})');page.wait_for_timeout(100)
  box=canvas.bounding_box()
  assert box['height']<=height-16,f'board taller than viewport: {width}x{height}: {box}'
  assert box['y']>=-1 and box['y']+box['height']<=height+1,f'board clipped after scroll: {width}x{height}: {box}'
  assert abs(box['width']-box['height'])<1,'board lost square aspect ratio'
  page.screenshot(path=str(out/f'viewport-{width}x{height}.png'))
  touch_drag_left()
  assert '90' in page.locator('#direction').get_attribute('style')
  # Every control must be reachable and fully visible after scrolling, with no fixed overlay.
  for control in ['pause','reset','calibrate','touch','sensor','palette']:
   locator=page.locator('#'+control);locator.scroll_into_view_if_needed();r=locator.bounding_box()
   assert r['y']>=-1 and r['y']+r['height']<=height+1,f'inaccessible control {control} at {width}x{height}'
   if control!='palette':locator.click(trial=True)
  layout_results.append({'width':width,'height':height,'canvasSize':box['height'],'fullyVisibleAfterScroll':True})
 page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller!==null')
 context.set_offline(True);page.reload();page.wait_for_timeout(300);assert page.locator('canvas').count()==1;page.locator('#pause').click();assert page.locator('#pause').get_attribute('aria-pressed')=='true'
 assert not errors,errors
 assert not console_errors,console_errors
 result={'passed':['390px mobile layout','pause freeze and resume','reset preserves pause','trusted browser touch drag gravity','palette switch','calibration','sensor denial fallback','simulated granted sensor','640x360 and 844x390 landscape; 390x844 and 360x640 portrait full canvas visibility','offline reload and interaction'],'pageErrors':errors,'consoleErrors':console_errors,'layouts':layout_results,'trustedBrowserTouch':True,'physicalDeviceValidated':False}
 (out/'browser-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2));browser.close()
