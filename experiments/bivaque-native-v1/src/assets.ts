export const photos={
  arrival:require('../assets/demo/arrival.webp'),
  moving:require('../assets/demo/moving.jpg'),
  friends:require('../assets/demo/friends.webp'),
  apartment:require('../assets/demo/apartment.jpg'),
  interior:require('../assets/demo/interior.jpg'),
  kitchen:require('../assets/demo/kitchen.jpg'),
  sofa:require('../assets/demo/sofa.jpg'),
  fridge:require('../assets/demo/fridge.jpg'),
  crib:require('../assets/demo/crib.jpg'),
  cake:require('../assets/demo/cake.jpg'),
  sunset:require('../assets/demo/sunset.webp'),
  pets:require('../assets/demo/pets.jpg'),
  service:require('../assets/demo/service.jpg'),
  workshop:require('../assets/demo/workshop.jpg'),
  classroom:require('../assets/demo/classroom.jpg'),
} as const;
export const hero={chegando:require('../assets/ilustracoes/chegando.webp'),morando:require('../assets/ilustracoes/morando.webp'),saindo:require('../assets/ilustracoes/saindo.webp')};
export type PhotoKey=keyof typeof photos;
