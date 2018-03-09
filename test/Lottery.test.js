const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const web3 = new Web3(ganache.provider());

const {interface, bytecode} = require('../compile');

let lottery;
let accounts;
let manager;

beforeEach(async () => {
  accounts = await web3.eth.getAccounts();
  manager = accounts[0];
  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({data: bytecode})
    .send({from: accounts[0], gas:'1000000'})
})

describe('Lottery Contract', () => {
  it('deploy a contract', () => {
    assert.ok(lottery.options.address);
  });

  it('allows multiple account to enter', async () => {
    await Promise.all(accounts.map(account => {
      return lottery.methods.enter().send({
        from: account,
        value: web3.utils.toWei('0.02', 'ether')
      });
    }));
    
    const players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });
    players.forEach((player, i) => assert.equal(accounts[i], player));
    assert.equal(accounts.length, players.length);
  });

  it('requires a minimun amount of ether to enter', (done) => {
    lottery.methods.enter().send({
        from: accounts[0],
        value: 0
      })
      .then(done, () => done());
  });

  it('only manager can call pickWinner', (done) => {
    lottery.methods.pickWinner().send({
        from: manager,
        value: 0
      })
      .then(done, () => done());
  });

  it('send money to the winner', async () => {
    await lottery.methods.enter().send({
        from: accounts[0],
        value: web3.utils.toWei('2', 'ether')
      })
    const initialBalance = await web3.eth.getBalance(manager);

    await lottery.methods.pickWinner().send({from: manager});

    const finalBalance = await web3.eth.getBalance(manager);
    const difference = finalBalance - initialBalance;
    assert(difference > web3.utils.toWei('1.8', 'ether'));
  });

  it('resets the players array after pick winner', async () => {
    await lottery.methods.enter().send({
        from: accounts[0],
        value: web3.utils.toWei('2', 'ether')
      })
    let players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });
    assert.equal(players.length, 1);
    await lottery.methods.pickWinner().send({from: manager});
    players = await lottery.methods.getPlayers().call({
      from: accounts[0]
    });
    assert.equal(players.length, 0);
  });
})
