// NOT COMPILED OR DEPLOYED YET. near-sdk-js escrow: one NEAR-held escrow per order.
import { NearBindgen, near, call, view, initialize, assert, NearPromise } from 'near-sdk-js';
@NearBindgen({})
export class Escrow {
  manager = ''; cap = '0'; orders = {};
  @initialize({}) init({ manager, cap_yocto }) { this.manager = manager; this.cap = cap_yocto; }
  @call({ payableFunction: true }) create_order({ id }) {
    assert(!this.orders[id], 'order exists');
    this.orders[id] = { payer: near.predecessorAccountId(), amount: near.attachedDeposit().toString(), released: '0' };
  }
  @call({}) release({ id, payee, amount }) {   // the manager's function-call key may ONLY call this
    assert(near.predecessorAccountId() === this.manager, 'manager only');
    const o = this.orders[id], a = BigInt(amount);
    assert(a <= BigInt(this.cap), 'over per-payout cap');
    assert(BigInt(o.released) + a <= BigInt(o.amount), 'over escrow');
    o.released = (BigInt(o.released) + a).toString();
    return NearPromise.new(payee).transfer(a);
  }
  @call({}) refund({ id }) {
    const o = this.orders[id]; assert(near.predecessorAccountId() === o.payer, 'payer only');
    const left = BigInt(o.amount) - BigInt(o.released); o.released = o.amount;
    return NearPromise.new(o.payer).transfer(left);
  }
  @view({}) get_order({ id }) { return this.orders[id]; }
}
