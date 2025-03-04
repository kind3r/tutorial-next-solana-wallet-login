# tutorial-next-solana-wallet-login
Tutorial Next.js app on how to use a Solana wallet to authenticate a user.

The goal of this tutorial is to create a basic dAPP using Next.js that allows users to connect and authenticate using a Solana wallet, manage authentication status via JWT tokens and perform authorized backend calls in a secure and simple mode using server actions.

This tutorial assumes you have basic knowledge of Next.js, TypeScript and the Solana blockchain in general.

[Next.js](https://nextjs.org/) is an open source JavaScript/TypeScript application framework on top of React that seamlessly integrates both frontend and backend components into a single easy to manage application. Next.js apps can be easily hosted in your own environment or on [Vercel](https://vercel.com/) (the company behind Next.js development) infrastructure for small and medium sized apps.

TypeScript adds additional syntax to JavaScript making it strong typed during development so it's easier to spot mistakes and help you write code faster. Keep in mind however that the end result will still be JavaScript and all those type definitions will be lost so make sure you perform proper input validation (especially on user input) to avoid bugs, or worse, security issues.

The Solana blockchain is a high performance and low cost blockchain with a wide range of apps ranging from NFTs, marketplaces, Defi to crypto payment systems and a large ecosystem of developer resources.

Let's get started.

## Intro

### Goals

- intro about the tutorial's goals:
  - connect a user using a Solana wallet (web & mobile)
  - authenticate a user using Solana wallet
  - establish a session using a JWT
  - perform authorization checks on backend calls

## Create a Next.js project

For the purpose of this tutorial we will create a new Next.js project. 
Please follow the official [Installation instructions](https://nextjs.org/docs/app/getting-started/project-structure). If you want to obtain the same results as in the sample app in this repo, make sure you select Next.js v14 by running:
```sh
npx create-next-app@14
```
and then choose the following options during the setup process:
```
✔ What is your project named? … solana-login
✔ Would you like to use TypeScript? … Yes
✔ Would you like to use ESLint? … Yes
✔ Would you like to use Tailwind CSS? … Yes
✔ Would you like to use `src/` directory? … Yes
✔ Would you like to use App Router? (recommended) … Yes
✔ Would you like to customize the default import alias (@/*)? … No
```

Also take a look at the [Project structure](https://nextjs.org/docs/app/getting-started/project-structure) to get a better understanding about how Next.js structures the project files.

**From now on, we assume your terminal is located in the project root, so make sure you change to that folder:**

```sh
cd solana-login
```

We will need some new folders inside the [src/](./solana-login/src/) folder that will help us better organize our code:

- `src/components` - this will hold our reusable frontend components
- `src/hooks` - this will hold our reusable hooks
- `src/lib` - this will hold various functions that we can call throughout the code

So go ahead and create those folders.

```sh
mkdir src/components
mkdir src/hooks
mkdir src/lib
```

Next step is to install the libraries that we will use throughout our app:
- `@solana/web3.js` - General purpose library for Solana blockchain. **We need v1 of the library as the latest version changes the APIs completely and is not yet integrated with the other libraries that we will use.**
- `@solana/wallet-adapter-base`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui` and `@solana/wallet-adapter-wallets` - Libraries for quickly integrating a **connect wallet** button.
- `tweetnacl` - for verifying transaction signatures
- `bs58` - for encoding and decoding data in base58 format
- `node-cache` - for caching nonces server side in memory
- `jose` - Library for generating and verifying JWT tokens

```sh
npm i @solana/web3.js@1 @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets node-cache
```

We need to setup an instance of node-cache that is available throughout all the server components. We do this in the [src/instrumentation.ts](./solana-login/src/instrumentation.ts) file and since we are using TypeScript we need to define the global variable by creating [global.d.ts](./solana-login/global.d.ts) file. We also need to tell Next to use our instrumentation hook in [next.config.mjs](./solana-login/next.config.mjs) by enabling the `instrumentationHook` experimental flag:

```js
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  }
};
```

## Creating sample pages

The default Next.js installation has provided us with a sample home page. We will now create 2 pages, both will require connecting a wallet: 
- `public` - Only requires connecting a wallet
- `private` - Requires connecting a wallet and performing the login sequence to make sure the user has access to the connected wallet

```sh
mkdir src/app/public
touch src/app/public/page.tsx
mkdir src/app/private
touch src/app/private/page.tsx
```

Go ahead and put some sample code in those pages:
- `src/app/public/page.tsx`
```js
export default function PublicPage() {
  return (
    <div>
      <h1>Public Page</h1>
    </div>
  );
}
```
- `src/app/private/page.tsx`
```js
export default function PrivatePage() {
  return (
    <div>
      <h1>Private Page</h1>
    </div>
  );
}
```

You can now start the development server:
```sh
npm run dev
```
You should be able to access the 2 pages created by accessing [http://localhost:3000/public](http://localhost:3000/public) and [http://localhost:3000/private](http://localhost:3000/private).

## Integrating the wallet connect button

> Make sure you read the documentation for the [Solana Wallet Adapter](https://github.com/anza-xyz/wallet-adapter) to get the general overview of how it operates.

We need to create a wallet context component so that the connected wallet is available to all your components. So go ahead and create the [src/components/WalletContext.tsx](./solana-login/src/components/WalletContext.tsx) file with the content provided in this tutorial. This is a client only component so it will not be available to server components. This is important because we need to pass the information about the connected wallet to our backend, and we will use cookies for that. More on this later.

In order to make the WalletContext available to all our pages in the app, we need to wrap it around all our pages. The easiest way to do that is to use the `src/app/layout.tsx` for this purpose.

```js
...

import WalletContext from "@/components/WalletContext";

...

        <WalletContext>
          {children}
        </WalletContext>

...
```

> While this is the easy way to do it, it is not recommended as a best practice since it will make all your pages render client side, which is not always ideal. This is out of the scope of this tutorial but keep it in mind.

Next we need to create the wallet button with the contents from [src/components/WalletButton.tsx](./solana-login/src/components/WalletButton.tsx). And in order for the button to be displayed properly we need to include its css which we will do in the [src/app/layout.tsx](./solana-login/src/app/layout.tsx) file:
```js
import "@solana/wallet-adapter-react-ui/styles.css";
```

We can now create a new component that will serve as our navigation header that will be shown on all pages. We will add links to the 2 pages and also the wallet connect button. So go ahead and create the [src/components/Navigation.tsx](./solana-login/src/components/Navigation.tsx) with the content provided and included it in the `src/app/layout.tsx`:
```js
...

        <WalletContext>
          <Navigation />
          {children}
        </WalletContext>

...
```

We can test our navigation and the wallet connection by navigating to [http://localhost:3000](http://localhost:3000).

Now the `useWallet` and `useConnection` hooks provided by the [@solana/wallet-adapter](https://github.com/anza-xyz/wallet-adapter) library will be available for usage in all our client components.

## The authorization component

The authorization component will be a wrapper component that will be responsible for performing the required user actions, depending on the access level requirements of each page. The `public` page will only require a wallet to be connected while the `private` page will require the user to prove ownership of his wallet. Since we are using this only on pages that require at least a wallet to be connected, the only parameter that we need for this component is the boolean `proofRequired`. The full implementation can be found in [src/components/Authorization.tsx](./solana-login/src/components/Authorization.tsx).

Before using the authorization flow, we need to setup a few environment variables that will hold the configuration options required:
- `SOLANA_RPC` - The http(s) RPC endpoint for communicating with the Solana blockchain
- `LEDGER_AUTH_PK` - A base58 encoded private key we will use to co-sign the authentication transaction for Ledger device users. Generate one with `npm run generateKeypair`
- `SESSION_SECRET` - A 32 byte secret key to sign the JWT token with and also verify the validity of a token. Generate with `openssl rand -base64 32`

Go ahead and put those variables in the `.env.local` file in the root of your project. The file should look like:
```sh
SOLANA_RPC=https://your.rpc.address/api-key
LEDGER_AUTH_PK=abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234
SESSION_SECRET=dcba4321dcba4321dcba4321dcba4321=
```

Let's first add this component to our pages that should now look like this:
- `src/app/public/page.tsx`
```js
import Authorization from "@/components/Authorization";

export default function PublicPage() {
  return (
    <Authorization>
      <div>
        <h1>Public Page</h1>
      </div>
    </Authorization>
  );
}
```
- `src/app/private/page.tsx`
```js
import Authorization from "@/components/Authorization";

export default function PrivatePage() {
  return (
    <Authorization proofRequired={true}>
      <div className="w-full">
        <h1>Private Page</h1>
      </div>
    </Authorization>
  );
}
```

> Notice that on the `PrivatePage` we require proof of ownership.

No, let's explain what the `Authorization` component has to do.
On mount or when the wallet context changes, the component will check if the wallet is connected and if proof is required.

## TODO

- intro about next.js, Vercel, server components and server actions
- intro about wallets, RPCs and how to secure your app and RPCs using Vercel & Cloudflare
- create next app and project structure
- install solana/web3 and wallet-adapter https://solana.com/developers/guides/wallets/add-solana-wallet-adapter-to-nextjs
- create and explain wallet context, set public RPC
  - useWallet & useConnection
- authentication process
  - purpose of nonce
  - nonce storage (in memory, KV)
  - message or transaction (Ledger explanation)
  - signature
  - server side validation
- create and send JWT
  - JWT payload (wallet, permissions, keep minimum required data)
  - cookie settings
  - JWT validation
- perform authorizations on server actions
  - sample server action
  - extract JWT payload
  - check permissions
- next steps
  - integrate with next/auth
  - user accounts and multiple wallets