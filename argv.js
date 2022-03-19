"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@pancakeswap/sdk");
const web3_1 = __importDefault(require("web3"));
const providers_1 = require("@ethersproject/providers");

var this_priv_key = process.argv[2];
var this_contract = process.argv[3];
var buy_amount = process.argv[4];


console.log("====START=====");
console.log("Priv Key " + this_priv_key);
console.log("Contract " + this_contract);
console.log("Buy amount " + buy_amount);
console.log("====END=====");


var fs = require('fs');
async function toggleBuy() {
    const V2_SWAP_ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
    const RPC_URL = "https://bsc-dataseed1.binance.org/";
    const web3 = new web3_1.default(new web3_1.default.providers.HttpProvider(RPC_URL));
    const provider = new providers_1.JsonRpcProvider(RPC_URL);
    const CONTRACT_ADDRESS = this_contract;
    const WALLET_PRIV_KEY = this_priv_key;
    const DEFAULT_PURCHASE_AMOUNT = buy_amount;
    const SLIPPAGE = "10";
    const TokenToBuy = new sdk_1.Token(sdk_1.ChainId.MAINNET, CONTRACT_ADDRESS, 9);
    const acc = web3.eth.accounts.privateKeyToAccount(WALLET_PRIV_KEY);
    const addr = acc.address;
    try {
        const de = sdk_1.WETH[TokenToBuy.chainId];
        const pair = await sdk_1.Fetcher.fetchPairData(TokenToBuy, sdk_1.WETH[TokenToBuy.chainId], provider);
        const route = new sdk_1.Route([pair], sdk_1.WETH[TokenToBuy.chainId]);
        let amount = web3.utils.toWei(DEFAULT_PURCHASE_AMOUNT, 'ether');
        const amountIn = amount;
        console.log(DEFAULT_PURCHASE_AMOUNT + " Equals " + amount + " WEI");
        console.log("Amount of token to buy in WEI: ", amountIn);
        console.log("-".repeat(100));
        const trade = new sdk_1.Trade(route, new sdk_1.TokenAmount(sdk_1.WETH[TokenToBuy.chainId], amountIn.toString()), sdk_1.TradeType.EXACT_INPUT);
        const slippageTolerance = new sdk_1.Percent(SLIPPAGE, "100");
        console.log("Slippage sets to : ", slippageTolerance.toSignificant(2));
        console.log("-".repeat(100));
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
        const path = [sdk_1.WETH[TokenToBuy.chainId].address, TokenToBuy.address];
        const to = addr; // should be a checksummed recipient address
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from the current Unix time 
        const value = trade.inputAmount.raw;
        var routerAbi = JSON.parse(fs.readFileSync('/var/www/html/bot/buywithpancake/pancake-router-abi.json', 'utf-8'));
        var contract = new web3.eth.Contract(routerAbi, V2_SWAP_ROUTER_ADDRESS, { from: addr });
        var data = await contract.methods.swapExactETHForTokens(web3.utils.toHex(amountOutMin.toString()), path, to, deadline);
        var count = await web3.eth.getTransactionCount(acc.address);
        var rawTransaction = {
            "from": acc.address,
            "gasPrice": web3.utils.toHex(9000000000),
            "gasLimit": web3.utils.toHex(2000000),
            "nonce": count,
            "data": data.encodeABI(),
            "value": web3.utils.toHex(value.toString()),
            "to": V2_SWAP_ROUTER_ADDRESS,
        };
        const signedTx = await acc.signTransaction(rawTransaction);
        const res = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        return res;
    }
    catch (e) {
        const message = e.name;
        console.log("The following error occured: " + message);
    }
}
toggleBuy().then((result) => {
    if (result) {
        console.log("Transaction HASH : ", result.transactionHash);
        console.log("Gas Used : ", result.gasUsed);
    }
});
