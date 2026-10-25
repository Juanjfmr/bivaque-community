/**
 * Neighborhood centroids copied from the approved R72 file:
 * prototypes/bivaque-html/src/data/demo/bairros.js
 * Public neighborhood-level approximate centers only; never street addresses or OMs.
 * Coordinates are [longitude, latitude]. No geocoding is performed by this module.
 */
export const BAIRROS = {
  "Brasília": {
    "Asa Sul":[-47.8930,-15.8170], "Asa Norte":[-47.8830,-15.7630],
    "Noroeste":[-47.9120,-15.7510],"Sudoeste":[-47.9270,-15.7970],
    "Cruzeiro":[-47.9330,-15.7890],"Lago Sul":[-47.8600,-15.8400],
    "Lago Norte":[-47.8500,-15.7300],"Guará":[-47.9800,-15.8200],
    "Águas Claras":[-48.0300,-15.8400]
  },
  "Manaus": {
    "Ponta Negra":[-60.0962,-3.0509],"Tarumã":[-60.0513,-3.0247],
    "Compensa":[-60.0560,-3.1050],"Planalto":[-60.0572,-3.0653],
    "Dom Pedro":[-60.0431,-3.0877],"Flores":[-60.0212,-3.0728],
    "Parque 10":[-60.0213,-3.0794],"Adrianópolis":[-60.0090,-3.1017],
    "Aleixo":[-59.9935,-3.0930],"Centro":[-60.0216,-3.1321],
    "Cidade Nova":[-59.9930,-3.0400]
  },
  "Natal": {
    "Ponta Negra":[-35.1800,-5.8800],"Capim Macio":[-35.1950,-5.8600],
    "Lagoa Nova":[-35.2100,-5.8300],"Candelária":[-35.2200,-5.8400],
    "Neópolis":[-35.2100,-5.8700],"Tirol":[-35.2000,-5.8000],
    "Petrópolis":[-35.1980,-5.7900],"Lagoa Seca":[-35.2100,-5.8100],
    "Alecrim":[-35.2200,-5.8000],"Lagoa Azul":[-35.2500,-5.7200],
    "Potengi":[-35.2500,-5.7500]
  },
  "Rio de Janeiro": {
    "Copacabana":[-43.1870,-22.9710],"Botafogo":[-43.1820,-22.9510],
    "Flamengo":[-43.1760,-22.9320],"Urca":[-43.1650,-22.9500],
    "Centro":[-43.1800,-22.9050],"Tijuca":[-43.2330,-22.9250],
    "Méier":[-43.2800,-22.9000],"Ilha do Governador":[-43.2000,-22.8000],
    "Barra da Tijuca":[-43.3660,-23.0000],"Jacarepaguá":[-43.3500,-22.9600],
    "Campo Grande":[-43.5600,-22.9000],"Vila Militar":[-43.4000,-22.8600]
  }
};
export const neighborhoodPoint = (city, hood) => BAIRROS[city]?.[hood] || null;
export function mapPinsFor(city, listings) {
 const grouped=new Map();
 for (const item of listings) {
   if (item.city!==city) continue;
   const point=neighborhoodPoint(city,item.hood);
   if (!point) continue;
   grouped.set(item.hood,{hood:item.hood,point,count:(grouped.get(item.hood)?.count||0)+1});
 }
 return [...grouped.values()].sort((a,b)=>b.count-a.count||a.hood.localeCompare(b.hood,"pt-BR"));
}
export function missingNeighborhoods(city,listings){
 return [...new Set(listings.filter(x=>x.city===city&&!neighborhoodPoint(city,x.hood)).map(x=>x.hood))];
}
