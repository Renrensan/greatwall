import * as bitcoin from "bitcoinjs-lib";
import { network } from "../bitcoin-provider";


export function addressToScriptPubKeyHex(address: string): string {
  const script = bitcoin.address.toOutputScript(address, network);
  return "0x" + script.toString("hex");
}

export function scriptPubKeyHexToAddress(scriptPubKeyHex: string): string {
  const hex = scriptPubKeyHex.startsWith("0x")
    ? scriptPubKeyHex.slice(2)
    : scriptPubKeyHex;

  const script = Buffer.from(hex, "hex");
  return bitcoin.address.fromOutputScript(script, network);
}