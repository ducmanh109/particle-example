/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {
  Button,
  ScrollView,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';

import * as particleAA from '@particle-network/rn-aa';
import {WholeFeeQuote} from '@particle-network/rn-aa';
import {evm} from '@particle-network/rn-auth-core';
import {
  AAFeeMode,
  EvmService,
  LoginType,
  SocialLoginPrompt,
  SupportAuthType,
} from '@particle-network/rn-base';
import {WalletType} from '@particle-network/rn-connect';
import BigNumber from 'bignumber.js';
import {ethers} from 'ethers';
import {Colors, Header} from 'react-native/Libraries/NewAppScreen';
import {ParticleProvider, useParticle} from './ParticleProvider.tsx';
import * as particleAuthCore from '@particle-network/rn-auth-core';
const Content = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  /*
   * To keep the template simple and small we're adding padding to prevent view
   * from rendering under the System UI.
   * For bigger apps the recommendation is to use `react-native-safe-area-context`:
   * https://github.com/AppAndFlow/react-native-safe-area-context
   *
   * You can read more about it here:
   * https://github.com/react-native-community/discussions-and-proposals/discussions/827
   */
  const safePadding = '5%';
  const zerooneGallery = {
    address: '0xAB90a599C90FD706294F429eFd6810603707AacC',
    c_chain_address: '0x02FF4CF1E5522bdc6f85CCB383dD1D2521460613',
    abi: [
      {
        inputs: [],
        name: 'AccessControlBadConfirmation',
        type: 'error',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'account',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'neededRole',
            type: 'bytes32',
          },
        ],
        name: 'AccessControlUnauthorizedAccount',
        type: 'error',
      },
      {
        inputs: [],
        name: 'InvalidInitialization',
        type: 'error',
      },
      {
        inputs: [],
        name: 'NotInitializing',
        type: 'error',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'uint64',
            name: 'version',
            type: 'uint64',
          },
        ],
        name: 'Initialized',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'uint256',
            name: 'itemId',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'address',
            name: 'collection',
            type: 'address',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'starToken',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'endToken',
            type: 'uint256',
          },
        ],
        name: 'ItemAdded',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'uint256',
            name: 'itemId',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'price',
            type: 'uint256',
          },
        ],
        name: 'ItemConvertedToPaid',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: 'bytes32',
            name: 'role',
            type: 'bytes32',
          },
          {
            indexed: true,
            internalType: 'bytes32',
            name: 'previousAdminRole',
            type: 'bytes32',
          },
          {
            indexed: true,
            internalType: 'bytes32',
            name: 'newAdminRole',
            type: 'bytes32',
          },
        ],
        name: 'RoleAdminChanged',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: 'bytes32',
            name: 'role',
            type: 'bytes32',
          },
          {
            indexed: true,
            internalType: 'address',
            name: 'account',
            type: 'address',
          },
          {
            indexed: true,
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
        ],
        name: 'RoleGranted',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: 'bytes32',
            name: 'role',
            type: 'bytes32',
          },
          {
            indexed: true,
            internalType: 'address',
            name: 'account',
            type: 'address',
          },
          {
            indexed: true,
            internalType: 'address',
            name: 'sender',
            type: 'address',
          },
        ],
        name: 'RoleRevoked',
        type: 'event',
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'address',
            name: 'collection',
            type: 'address',
          },
          {
            indexed: false,
            internalType: 'uint256',
            name: 'tokenId',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'address',
            name: 'to',
            type: 'address',
          },
        ],
        name: 'TokenCollected',
        type: 'event',
      },
      {
        inputs: [],
        name: 'DEFAULT_ADMIN_ROLE',
        outputs: [
          {
            internalType: 'bytes32',
            name: '',
            type: 'bytes32',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'collectionAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'startToken',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endToken',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'from',
            type: 'address',
          },
        ],
        name: 'addItem',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'collectionAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'startTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endTime',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'from',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'artworkId',
            type: 'uint256',
          },
        ],
        name: 'addOEItem',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'itemId',
            type: 'uint256',
          },
        ],
        name: 'collect',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'itemId',
            type: 'uint256',
          },
        ],
        name: 'collectOpenEditionArt',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        name: 'creatorToLastItemId',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'currentItemCounter',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'destinationChain',
        outputs: [
          {
            internalType: 'bytes32',
            name: '',
            type: 'bytes32',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'destinationRecipientAddress',
        outputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'itemId',
            type: 'uint256',
          },
        ],
        name: 'getItemDetails',
        outputs: [
          {
            components: [
              {
                internalType: 'bool',
                name: 'exists',
                type: 'bool',
              },
              {
                internalType: 'address',
                name: 'collectionAddress',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'startToken',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endToken',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'lastTokenCollected',
                type: 'uint256',
              },
            ],
            internalType: 'struct ZerooneGallery.Item',
            name: '',
            type: 'tuple',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'bytes32',
            name: 'role',
            type: 'bytes32',
          },
        ],
        name: 'getRoleAdmin',
        outputs: [
          {
            internalType: 'bytes32',
            name: '',
            type: 'bytes32',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'bytes32',
            name: 'role',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'account',
            type: 'address',
          },
        ],
        name: 'grantRole',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'bytes32',
            name: 'role',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'account',
            type: 'address',
          },
        ],
        name: 'hasRole',
        outputs: [
          {
            internalType: 'bool',
            name: '',
            type: 'bool',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'marketControllerAddr',
            type: 'address',
          },
        ],
        name: 'initialize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        name: 'itemIdToCreator',
        outputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        name: 'itemIdToPrice',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'messenger',
        outputs: [
          {
            internalType: 'contract ITeleporterMessenger',
            name: '',
            type: 'address',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: 'operator',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'from',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'tokenId',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes',
          },
        ],
        name: 'onERC721Received',
        outputs: [
          {
            internalType: 'bytes4',
            name: '',
            type: 'bytes4',
          },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'bytes32',
            name: '',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
          {
            internalType: 'bytes',
            name: 'message',
            type: 'bytes',
          },
        ],
        name: 'receiveTeleporterMessage',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'bytes32',
            name: 'role',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'callerConfirmation',
            type: 'address',
          },
        ],
        name: 'renounceRole',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'bytes32',
            name: 'role',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'account',
            type: 'address',
          },
        ],
        name: 'revokeRole',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'bytes32',
            name: '_destinationChain',
            type: 'bytes32',
          },
        ],
        name: 'setDestinationChain',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: '_destinationRecipientAddress',
            type: 'address',
          },
        ],
        name: 'setDestinationRecipientAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'address',
            name: '_messenger',
            type: 'address',
          },
        ],
        name: 'setMessenger',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'bytes4',
            name: 'interfaceId',
            type: 'bytes4',
          },
        ],
        name: 'supportsInterface',
        outputs: [
          {
            internalType: 'bool',
            name: '',
            type: 'bool',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [
          {
            internalType: 'uint256',
            name: 'price',
            type: 'uint256',
          },
        ],
        name: 'upgradeLatestItem',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
  };

  const {
    connect,
    sendCode,
    signMessage,
    getSmartAccountAddress,
    getEoaAddress,
    currentChain,
    switchToSubnet,
    switchToCChain,
  } = useParticle();

  console.log('currentChain>>>>', currentChain);

  const onSendCode = async () => {
    const email = 'monster1092k@gmail.com';

    try {
      const response = await sendCode(email);
      console.log('Response:', response);
    } catch (error) {
      console.error('Error sending code:', error);
    }
  };

  //const onConnectWallet = async () => {
  //try {
  // ERROR NOTE
  // sign message popup need to be removed when calling connect function
  //  const responseConnect = await connect(WalletType.AuthCore, {
  //    loginType: LoginType.Google,
  //    supportAuthType: [SupportAuthType.Google],
  //    socialLoginPrompt: SocialLoginPrompt.SelectAccount,
  //  });

  //  const signature = await signMessage('hihihehe');

  //  console.log(
  //    'responseConnect-->',
  //    //responseConnect,
  //    'signature--->',
  //  signature,
  //  );
  //} catch (error) {
  //console.error('Error connecting wallet:', error);
  // }
  //};

  const onConnectWallet = async () => {
    try {
      // ERROR NOTE
      // sign message popup need to be removed when calling connect function
      const responseConnect = await particleAuthCore.connect(
        LoginType.Google,
        null,
        [],
        SocialLoginPrompt.Consent,
      );

      const signature = await signMessage('hihihehe');

      console.log(
        'responseConnect-->',
        responseConnect,
        'signature--->',
        signature,
      );
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  async function handleCollect() {
    try {
      // 1. Get smart account address
      const smartAccountAddress = await getSmartAccountAddress();
      if (!smartAccountAddress) {
        console.log('Please connect your wallet first');

        return;
      }

      // 2. Encode contract call data
      const contractInterface = new ethers.Interface(zerooneGallery.abi);
      const collectTxData = contractInterface.encodeFunctionData('collect', [
        38098,
      ]);

      // 3. Create transaction
      const transaction = await EvmService.createTransaction(
        smartAccountAddress,
        collectTxData,
        BigNumber(0), // value
        zerooneGallery.address,
      );

      const eoaAddress = await getEoaAddress();

      // ERROR NOTE: this cause error
      // Collect error: {message: 'AA service not support this chain'}
      const wholeFeeQuote = (await particleAA.rpcGetFeeQuotes(eoaAddress!, [
        transaction,
      ])) as WholeFeeQuote;

      // 4. Send transaction (Sponsored mode)
      const userOpResponse = await evm.sendTransaction(
        transaction,
        AAFeeMode.gasless(wholeFeeQuote),
      );

      console.log('userOpResponse', userOpResponse);
    } catch (error) {
      console.log('Collect error:', error);
    }
  }

  return (
    <View style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView style={backgroundStyle}>
        <View style={{paddingRight: safePadding}}>
          <Header />
        </View>
      </ScrollView>

      <Button title="Send email code" color={'red'} onPress={onSendCode} />

      <Button title="Log in" color={'green'} onPress={onConnectWallet} />

      <Button title="Call SC" color={'yellow'} onPress={handleCollect} />

      <Button
        title="Switch to subnet"
        color={'brown'}
        onPress={switchToSubnet}
      />

      <Button
        title="Switch to mainnet"
        color={'gray'}
        onPress={switchToCChain}
      />
    </View>
  );
};

function App(): React.JSX.Element {
  return (
    <ParticleProvider>
      <Content />
    </ParticleProvider>
  );
}

export default App;
