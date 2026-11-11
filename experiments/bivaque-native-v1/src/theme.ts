import { Platform } from 'react-native';
export const C={
  bg:'#f3f5f6',paper:'#ffffff',ink:'#1c262b',sub:'#67757c',soft:'#dde4e7',deep:'#26424f',clay:'#b84a3a',
  sand:'#f3e8df',mist:'#ebeff0',sage:'#dce7db',mint:'#e8f0e8',gold:'#e9bc77',line:'#dfe5e7',
} as const;
export const serif=Platform.select({ios:'Georgia',android:'serif',default:'Georgia'});
export const shadow={shadowColor:'#23303a',shadowOpacity:0.09,shadowRadius:16,elevation:3};
