// TODO Factory
/**
 * Abstract class for items
 * @param {string} name - Item name
 * @param {string} itemType - Item type
 * @param {number} cost - Item cost
 */
function Item(name = '', itemType = 'common', cost = 0): void {
  this.name = name;
  this.itemType = itemType;
  this.cost = cost;
}

Item.prototype.toString = function() {
  return this.name;
};

export default Item;
