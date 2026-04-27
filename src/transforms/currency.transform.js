import { Transform } from 'stream';

export class CurrencyTransform extends Transform {
  constructor(rate) {
    super({ objectMode: true });
    this.rate = rate;
  }

  _transform(item, encoding, callback) {
    const transformed = {
      ...item,
      price: parseFloat((item.price * this.rate).toFixed(2)),
      currency: 'UAH',
    };

    callback(null, transformed);
  }
}
