import { Address, Bytes } from "@graphprotocol/graph-ts";
import { PairCreated } from "../generated/Router/PairFactory";
import {
  PairEdge,
  PairTree,
  PathToTarget,
  TokenToEdge,
} from "../generated/schema";

export function handlePairCreated(event: PairCreated): void {
  // add the pair to a tree structure with a path to BNB as root
  // this will allow us to get the path from any token to BNB
  // and then we can get the path from any token to any other token
  // by combining the paths
  // this will allow us to get the volume of any token in BNB

  // get the pair address
  const pairAddress = event.params.pair;
  // get the token0 address
  const token0Address = event.params.token0;
  // get the token1 address
  const token1Address = event.params.token1;

  // create an edge and add it to the tree
  // the edge will be from token0 to token1 and the pair address will be the edge id
  const pairEdge = new PairEdge(pairAddress.toHex());
  pairEdge.token0 = token0Address;
  pairEdge.token1 = token1Address;
  pairEdge.stable = event.params.stable;
  pairEdge.save();

  // get or create TokenToEdge for each token
  let token0ToEdge = TokenToEdge.load(token0Address.toHex());
  if (token0ToEdge == null) {
    token0ToEdge = new TokenToEdge(token0Address.toHex());
    token0ToEdge.edges = [];
  }
  let token1ToEdge = TokenToEdge.load(token1Address.toHex());

  if (token1ToEdge == null) {
    token1ToEdge = new TokenToEdge(token1Address.toHex());
    token1ToEdge.edges = [];
  }

  // add the edge to the token
  const token0Edges = token0ToEdge.edges;
  token0Edges.push(pairEdge.id);
  token0ToEdge.edges = token0Edges;
  token0ToEdge.save();

  // add the edge to the token
  const token1Edges = token1ToEdge.edges;
  token1Edges.push(pairEdge.id);
  token1ToEdge.edges = token1Edges;
  token1ToEdge.save();

  // get or create PairTree entity
  let pairTree = PairTree.load("PAIR_TREE");
  if (pairTree == null) {
    pairTree = new PairTree("PAIR_TREE");
    pairTree.edges = [];
  }

  // add the edge to the tree
  const edges = pairTree.edges;
  edges.push(pairEdge.id);
  pairTree.edges = edges;
  pairTree.save();

  // get the path to WBNB for both tokens
  const WBNB = Address.fromString("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");

  const USDC = Address.fromString("0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d");

  const BUSD = Address.fromString("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56");

  const HEY = Address.fromString("0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5");

  const FRAX = Address.fromString("0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40");

  const targets = [WBNB, USDC, BUSD, HEY, FRAX];

  calculatePathToTarget(token0Address, WBNB);
  //   calculatePathToTarget(token1Address, WBNB);

  //   savePathToTarget(token0Address, Address.fromBytes(WBNB));
  //   savePathToTarget(token1Address, Address.fromBytes(WBNB));

  //   for (let i = 0; i < targets.length; i++) {
  //     const target = targets[i];
  //     savePathToTarget(token0Address, Address.fromBytes(target));
  //     savePathToTarget(token1Address, Address.fromBytes(target));
  //   }
}

function dfs(
  token: Address,
  target: Address,
  visited: Map<Address, Boolean>,
  parents: Map<Address, Address>
): Map<Address, Address> {
  if (token == target) {
    return parents; // create the path from parents
  }

  if (visited.has(token)) {
    return parents;
  }

  visited.set(token, true);

  const tokenToEdge = TokenToEdge.load(token.toHex())!;

  for (let i = 0; i < tokenToEdge.edges.length; i++) {}
}
