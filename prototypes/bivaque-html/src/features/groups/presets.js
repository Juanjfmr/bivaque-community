/* ================= Grupos (modelo Nextdoor adaptado) ================= */
const GTPL={
 vizinhanca:{ic:'home_work',name:'Vizinhança',rules:'Avisos e ajuda entre vizinhos. Não publique endereço completo nem fotos de crianças sem autorização.'},
 escola:{ic:'school',name:'Escola',rules:'Assuntos da escola e das turmas. Combine caronas e trocas com respeito.'},
 esporte:{ic:'directions_run',name:'Esporte',rules:'Combine treinos e jogos. Ponto de encontro sempre em local público.'},
 pets:{ic:'pets',name:'Pets',rules:'Dicas, adoção responsável e achados e perdidos.'},
 familia:{ic:'family_restroom',name:'Família',rules:'Rotina com filhos, festas e trocas. Fotos de crianças só com autorização dos pais.'},
 livre:{ic:'forum',name:'Livre',rules:'Seja útil e respeitoso. Propaganda só como Oferta, quando o grupo permitir.'},
 turma:{ic:'flight_land',name:'Turma de chegada',rules:'Quem chega à cidade no mesmo ciclo. Mudança, escola, moradia e o primeiro encontro.'}
};
const INTERESTS=[['filhos','Filhos pequenos','child_care'],['pets','Pets','pets'],['corrida','Corrida','directions_run'],['ciclismo','Ciclismo','directions_bike'],['concursos','Concursos e preparatórios','school'],['culinaria','Culinária','restaurant'],['futebol','Futebol','sports_soccer'],['fe','Fé','church']];
const NOTIF={tudo:['notifications_active','Tudo','Toda publicação do grupo'],destaques:['notifications','Destaques','Respostas a você, eventos e aviso fixado'],nada:['notifications_off','Nada','As publicações aparecem só na Início']};
