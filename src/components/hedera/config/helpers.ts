import { AccountId, ContractFunctionParameters } from "@hiero-ledger/sdk";
import { ContractFunctionParameterBuilderParam } from "./type";



export class ContractFunctionParameterBuilder {
  private params: ContractFunctionParameterBuilderParam[] = [];

  public addParam(param: ContractFunctionParameterBuilderParam): ContractFunctionParameterBuilder {
    this.params.push(param);
    return this;
  }

  
  public buildAbiFunctionParams(): string {
    return this.params.map(param => `${param.type} ${param.name}`).join(', ');
  }

  public buildEthersParams(): string[] {
    return this.params.map(param => param.value.toString());
  }

  public buildHAPIParams(): ContractFunctionParameters {
    const contractFunctionParams = new ContractFunctionParameters();
    for (const param of this.params) {
      const alphanumericIdentifier: RegExp = /^[a-zA-Z][a-zA-Z0-9]*$/;
      if (!param.type.match(alphanumericIdentifier)) {
        throw new Error(`Invalid type: ${param.type}. Type must only contain alphanumeric characters.`);
      }
      // captitalize the first letter of the type
      const type = param.type.charAt(0).toUpperCase() + param.type.slice(1);
      const functionName = `add${type}`;
      if (functionName in contractFunctionParams) {
        (contractFunctionParams as any)[functionName](param.value);
      } else {
        throw new Error(`Invalid type: ${param.type}. Could not find function ${functionName} in ContractFunctionParameters class.`);
      }
    }

    return contractFunctionParams;
  }
}

export function convertHederaAccountIdToEVM(accountIdStr: string): string {
  return "0x" + AccountId.fromString(accountIdStr).toEvmAddress();
}
