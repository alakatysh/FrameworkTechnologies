let INVENTORY = [
  { id: 1, name: 'Monitor', price: 500, qty: 10 },
  { id: 2, name: 'Keyboard', price: 100, qty: 20 },
  { id: 3, name: 'Mouse', price: 50, qty: 30 },
];
export const getInventory = () => INVENTORY;
export const setInventory = (newData) => {
  INVENTORY = newData;
};
export const addItem = (item) => INVENTORY.push(item);
