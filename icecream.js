let iceCreamFlavors = [
  { name: "Chocolate", type: "Chocolate", price: 2 },
  { name: "Strawberry", type: "Fruit", price: 1 },
  { name: "Vanilla", type: "Vanilla", price: 2 },
  { name: "Pistachio", type: "Nuts", price: 1.5 },
  { name: "Neapolitan", type: "Chocolate", price: 2 },
  { name: "Mint Chip", type: "Chocolate", price: 1.5 },
  { name: "Raspberry", type: "Fruit", price: 1 },
];

let transactions = [];

transactions.push({ scoops: ["Chocolate", "Vanilla", "Mint chip"], total: 3 });
transactions.push({ scoops: ["Raspberry", "StrawBerry"], total: 3 });
transactions.push({ scoops: ["Raspberry", "vanilla"], total: 5 });

const total = transactions.reduce((acc, curr) => acc + curr.total, 0);
console.log(`You've made ${total} $ today`);

let flavorDistribution = transactions.reduce((acc, curr) => {
  curr.scoops.forEach(scoop => {
    const normalizedScoop = scoop.toLowerCase(); // 소문자로 변경
    if (!acc[normalizedScoop]) {
      acc[normalizedScoop] = 0;
    }
    acc[normalizedScoop]++;
  });
  return acc;
}, {});

console.log("맛별 판매량:", flavorDistribution);

const flavorKeys = Object.keys(flavorDistribution);

const bestSellersInfo = flavorKeys.reduce((acc, flavor) => {
  const currentCount = flavorDistribution[flavor];

  if (currentCount > acc.count) {

    return { flavors: [flavor], count: currentCount };
  } else if (currentCount === acc.count) {
    acc.flavors.push(flavor);
  }
  return acc;
}, { flavors: [], count: 0 }); 


console.log(`\n가장 많이 팔린 맛은 ${bestSellersInfo.flavors.join(', ')} 이며, ${bestSellersInfo.count}개 팔렸습니다! 🍦`);
