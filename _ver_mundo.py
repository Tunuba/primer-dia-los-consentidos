import sys
from PIL import Image
W,H=1440,800
cielo=Image.new('RGBA',(W,H),(150,200,240,255))
lej=Image.open('img/lejos.png'); cer=Image.open('img/cerca.png')
cielo.alpha_composite(lej,(-100,600-lej.height+10) if False else (0,0), (100,0,100+W,lej.height)) if False else None
c=cielo.copy()
c.alpha_composite(lej.crop((100,0,100+W,lej.height)),(0,600-lej.height+20))
c.alpha_composite(cer.crop((0,0,W,cer.height)),(0,600-cer.height+10))
m=Image.open(sys.argv[1] if len(sys.argv)>1 else 'img/mundo.png'); c.alpha_composite(m)
c.alpha_composite(Image.open('img/frente.png'))
x0,y0,x1,y1=[int(v) for v in sys.argv[2].split(',')] if len(sys.argv)>2 else (0,0,W,H)
k=int(sys.argv[3]) if len(sys.argv)>3 else 1
c.crop((x0,y0,x1,y1)).resize(((x1-x0)*k,(y1-y0)*k),Image.NEAREST).save('_mundo.png')
