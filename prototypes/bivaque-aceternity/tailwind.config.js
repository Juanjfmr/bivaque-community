export default {
  content:["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme:{extend:{colors:{graphite:"#253033",paper:"#F2F0EB",brasa:"#B84A3A"},
    animation:{"spotlight":"spotlight 2s ease .75s 1 forwards","scroll":"scroll var(--animation-duration,40s) var(--animation-direction,forwards) linear infinite","meteor":"meteor 5s linear infinite"},
    keyframes:{spotlight:{"0%":{opacity:0,transform:"translate(-72%,-62%) scale(.5)"},"100%":{opacity:1,transform:"translate(-50%,-40%) scale(1)"}},scroll:{to:{transform:"translate(calc(-50% - 0.5rem))"}},meteor:{"0%":{transform:"rotate(215deg) translateX(0)",opacity:1},"70%":{opacity:1},"100%":{transform:"rotate(215deg) translateX(-500px)",opacity:0}}}
  }},plugins:[]
};