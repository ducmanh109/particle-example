import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {Buffer} from 'buffer';

import {ChainInfo, Avalanche, Zeroone} from '@particle-network/chains';

import * as particleBase from '@particle-network/rn-base';
import {
  Env,
  ParticleInfo,
  SecurityAccountConfig,
  EvmService,
  SmartAccountInfo,
  AccountName,
} from '@particle-network/rn-base';

import * as particleAuthCore from '@particle-network/rn-auth-core';
import {evm} from '@particle-network/rn-auth-core';

import * as particleConnect from '@particle-network/rn-connect';
import {WalletType} from '@particle-network/rn-connect';

import * as particleAA from '@particle-network/rn-aa';
import {LoginType, SupportAuthType} from '@particle-network/rn-base';

// --- connect chain sync helper ---
async function setConnectChain(chainInfo: ChainInfo) {
  const anyConnect = particleConnect as any;
  if (typeof anyConnect.setChain === 'function') {
    await anyConnect.setChain(chainInfo);
  } else if (typeof anyConnect.setChainInfo === 'function') {
    await anyConnect.setChainInfo(chainInfo);
  }
}

// ---------- config ----------
const DEFAULT_CHAIN: ChainInfo = Avalanche;
const ALT_CHAIN: ChainInfo = Zeroone;

ParticleInfo.projectId = '869f3430-7f88-4fe4-afef-1d300f6c5de6';
ParticleInfo.clientKey = 'c8AfXtRdc4L8uK4qDZwi8ruvfZKPsKmkN0mr2Cf0';

if (!ParticleInfo.projectId || !ParticleInfo.clientKey) {
  throw new Error('Missing Particle project credentials.');
}

// ---------- types ----------
type SmartAccountData = {
  chainInfo: ChainInfo;
  smartAccountAddress?: string;
  isDeployed?: boolean;
  lastUpdated?: Date;
};

type ParticleContextType = {
  activeWalletType: WalletType | null;
  activeAddress: string | null;

  particleUserInfo: particleAuthCore.UserInfo | null;
  isLoading: boolean;

  currentChain: ChainInfo;
  switchToChain: (chainInfo: ChainInfo) => Promise<boolean>;
  switchToCChain: () => Promise<boolean>;
  switchToSubnet: () => Promise<boolean>;

  connect: (
    walletType: WalletType,
    config?: particleConnect.ParticleConnectConfig,
  ) => Promise<particleAuthCore.UserInfo | undefined>;
  getConnected: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendCode: (email: string) => Promise<boolean>;

  signMessage: (msg: string) => Promise<string | undefined>;

  smartAccounts: Map<number, SmartAccountData>;
  smartAccount?: SmartAccountData;
  isDeploy: (chainInfo?: ChainInfo) => Promise<boolean | undefined>;
  getSmartAccountAddress: (
    chainInfo?: ChainInfo,
    scanForUpgradedAccountsFromV1?: boolean,
  ) => Promise<string | undefined>;
  getAllSmartAccounts: () => Promise<Map<number, SmartAccountData>>;
  getSmartAccountForChain: (
    chainInfo: ChainInfo,
  ) => Promise<string | undefined>;
  refreshSmartAccountData: (chainInfo?: ChainInfo) => Promise<void>;
};

// ---------- context ----------
const ParticleContext = createContext<ParticleContextType | undefined>(
  undefined,
);

// ---------- helpers ----------
function mapSupport(loginType?: LoginType): SupportAuthType | undefined {
  switch (loginType) {
    case LoginType.Google:
      return SupportAuthType.Google;
    case LoginType.Email:
      return SupportAuthType.Email;
    case LoginType.Phone:
      return SupportAuthType.Phone;
    case LoginType.Apple:
      return SupportAuthType.Apple;
    default:
      return undefined;
  }
}

function ensureAuthCoreConfig(
  cfg?: particleConnect.ParticleConnectConfig,
): particleConnect.ParticleConnectConfig | undefined {
  if (!cfg) {
    return cfg;
  }
  const has =
    Array.isArray((cfg as any).supportAuthType) &&
    (cfg as any).supportAuthType.length > 0;
  if (!has) {
    const inferred = mapSupport(cfg.loginType as LoginType | undefined);
    if (inferred) {
      return {...cfg, supportAuthType: [inferred]};
    }
  }
  return cfg;
}

// ---------- provider ----------
export const ParticleProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [particleUserInfo, setParticleUserInfo] =
    React.useState<particleAuthCore.UserInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const [currentChain, setCurrentChain] =
    React.useState<ChainInfo>(DEFAULT_CHAIN);
  const [smartAccounts, setSmartAccounts] = React.useState<
    Map<number, SmartAccountData>
  >(new Map());

  const [activeWalletType, setActiveWalletType] =
    React.useState<WalletType | null>(null);
  const [activeAddress, setActiveAddress] = React.useState<string | null>(null);

  const initOnce = useRef(false);

  // Centralized hard reset for local session/UI
  const resetSession = React.useCallback(() => {
    setParticleUserInfo(null);
    setActiveWalletType(null);
    setActiveAddress(null);
    setSmartAccounts(new Map());
  }, []);

  useEffect(() => {
    if (initOnce.current) {
      return;
    }
    initOnce.current = true;

    (async () => {
      // Base / Auth / AA
      particleBase.init(DEFAULT_CHAIN, Env.Production);
      particleBase.setSecurityAccountConfig(new SecurityAccountConfig(0, 0));
      particleAuthCore.init();
      particleAA.init(AccountName.BICONOMY_V2());
      particleAA.enableAAMode();

      // Connect init
      particleConnect.init(DEFAULT_CHAIN, Env.Production, {
        name: 'RN Demo',
        icon: 'https://raw.githubusercontent.com/github/explore/main/topics/react/react.png',
        url: 'https://example.com',
        description: 'RN Demo',
      });

      // Wallet adapters
      try {
        await (particleConnect as any).setWallets?.([WalletType.AuthCore]);
      } catch {}
      try {
        await (particleConnect as any).setSupportWalletTypes?.([
          WalletType.AuthCore,
        ]);
      } catch {}

      // Make sure Connect is on the same chain from the start
      await setConnectChain(DEFAULT_CHAIN).catch(() => {});

      // Restore prior session if any
      await restoreSession();
    })().catch(e => console.log('init error:', e));
  }, [restoreSession]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function restoreSession() {
    const connected = await particleAuthCore.isConnected().catch(() => false);
    if (!connected) {
      return;
    }
    const user = await particleAuthCore.getUserInfo();
    const addr = await evm.getAddress().catch(() => undefined);
    if (user?.uuid && addr) {
      setParticleUserInfo(user);
      setActiveWalletType(WalletType.AuthCore);
      setActiveAddress(addr);
      await initializeAllSmartAccounts(addr);
    }
  }

  // ----- chains -----
  async function switchToChain(chainInfo: ChainInfo): Promise<boolean> {
    try {
      setIsLoading(true);
      const ok = await particleBase.setChainInfo(chainInfo);
      console.log('switchToChain ok:', ok, chainInfo);
      await setConnectChain(chainInfo).catch(() => {});
      if (ok) {
        setCurrentChain(chainInfo);
      }
      return !!ok;
    } catch (e) {
      console.log('switchToChain error:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  }
  const switchToCChain = () => switchToChain(DEFAULT_CHAIN);
  const switchToSubnet = () => switchToChain(ALT_CHAIN);

  // ----- auth/connect -----
  async function sendCode(email: string) {
    return particleAuthCore.sendEmailCode(email);
  }

  async function getConnected() {
    const authConnected = await particleAuthCore
      .isConnected()
      .catch(() => false);
    return authConnected || !!activeAddress;
  }

  async function connect(
    walletType: WalletType,
    config?: particleConnect.ParticleConnectConfig,
  ) {
    try {
      setIsLoading(true);
      let address: string | undefined;
      let user: particleAuthCore.UserInfo | undefined;

      if (walletType === WalletType.AuthCore) {
        const cfg = ensureAuthCoreConfig(config);
        await particleConnect.connect(walletType, cfg);
        user = await particleAuthCore.getUserInfo().catch(() => undefined);
        address = await evm.getAddress();
      } else {
        await particleConnect.connect(walletType, config);
        const accounts = await particleConnect.getAccounts(walletType);
        address = accounts?.[0].publicAddress;
        try {
          user = await particleAuthCore.getUserInfo();
        } catch {}
      }

      if (!address) {
        throw new Error('No account returned from wallet');
      }

      setActiveWalletType(walletType);
      setActiveAddress(address);
      if (user) {
        setParticleUserInfo(user);
      }

      await initializeAllSmartAccounts(address);
      return user;
    } catch (error) {
      console.log('connect error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function disconnect(): Promise<void> {
    setIsLoading(true);
    try {
      // Try to disconnect at SDK level, but UI should reset regardless
      if (activeWalletType === WalletType.AuthCore) {
        await particleAuthCore.disconnect();
      } else if (activeWalletType && activeAddress) {
        await particleConnect.disconnect(activeWalletType, activeAddress);
      }
    } catch (e) {
      console.log('disconnect error (ignored to reset UI):', e);
    } finally {
      resetSession(); // <- guarantees the screen flips back to login
      setIsLoading(false);
    }
  }

  // ----- signing -----
  async function signMessage(message: string) {
    try {
      if (!message) {
        throw new Error('Empty message');
      }
      if (!activeWalletType || !activeAddress) {
        throw new Error('Not connected');
      }
      const hex = '0x' + Buffer.from(message, 'utf8').toString('hex');
      return await particleConnect.signMessage(
        activeWalletType,
        activeAddress,
        hex,
      );
    } catch (e) {
      console.log('signMessage error:', e);
    }
  }

  // ----- AA helpers -----
  async function initializeAllSmartAccounts(ownerAddress: string) {
    const chains: ChainInfo[] = [DEFAULT_CHAIN, ALT_CHAIN];
    const next = new Map<number, SmartAccountData>(
      chains.map(c => [c.id, {chainInfo: c, lastUpdated: new Date()}]),
    );

    for (const c of chains) {
      try {
        const smartAccountAddress = await getSmartAccountAddressForChain(
          ownerAddress,
          c,
        );
        const deployed = await isDeployedForChain(ownerAddress, c);
        next.set(c.id, {
          chainInfo: c,
          smartAccountAddress,
          isDeployed: deployed,
          lastUpdated: new Date(),
        });
      } catch (e) {
        console.log(`init AA ${c.name} error:`, e);
      }
    }

    setSmartAccounts(next);
    setCurrentChain(DEFAULT_CHAIN);
  }

  async function getSmartAccountAddress(
    chainInfo?: ChainInfo,
    scanForUpgradedAccountsFromV1?: boolean,
  ): Promise<string | undefined> {
    try {
      if (!activeAddress) {
        throw new Error('No active address');
      }
      const target = chainInfo ?? currentChain;

      const cached = smartAccounts.get(target.id)?.smartAccountAddress;
      if (cached && !scanForUpgradedAccountsFromV1) {
        return cached;
      }

      const addr = await getSmartAccountAddressForChain(
        activeAddress,
        target,
        scanForUpgradedAccountsFromV1,
      );

      if (addr) {
        const updated = new Map(smartAccounts);
        const base = updated.get(target.id) ?? {chainInfo: target};
        updated.set(target.id, {
          ...base,
          smartAccountAddress: addr,
          lastUpdated: new Date(),
        });
        setSmartAccounts(updated);
      }

      return addr;
    } catch (e) {
      console.log('getSmartAccountAddress error:', e);
    }
  }

  async function getSmartAccountAddressForChain(
    ownerAddress: string,
    chainInfo: ChainInfo,
    scanForUpgradedAccountsFromV1?: boolean,
  ): Promise<string | undefined> {
    const account = AccountName.BICONOMY_V2();
    const params = [
      {
        name: account.name,
        version: account.version,
        ownerAddress,
        ...(scanForUpgradedAccountsFromV1 && {scanForUpgradedAccountsFromV1}),
      },
    ];
    const result: SmartAccountInfo[] = await EvmService.getSmartAccount(params);
    return result?.[0]?.smartAccountAddress;
  }

  async function isDeploy(chainInfo?: ChainInfo): Promise<boolean | undefined> {
    try {
      if (!activeAddress) {
        return undefined;
      }
      const target = chainInfo ?? currentChain;

      const cached = smartAccounts.get(target.id)?.isDeployed;
      if (typeof cached === 'boolean') {
        return cached;
      }

      const deployed = await isDeployedForChain(activeAddress, target);

      const updated = new Map(smartAccounts);
      const base = updated.get(target.id) ?? {chainInfo: target};
      updated.set(target.id, {
        ...base,
        isDeployed: deployed,
        lastUpdated: new Date(),
      });
      setSmartAccounts(updated);

      return deployed;
    } catch (e) {
      console.log('isDeploy error:', e);
    }
  }

  async function isDeployedForChain(ownerAddress: string, _chain: ChainInfo) {
    return particleAA.isDeploy(ownerAddress);
  }

  async function getSmartAccountForChain(chainInfo: ChainInfo) {
    return getSmartAccountAddress(chainInfo);
  }

  async function getAllSmartAccounts() {
    return smartAccounts;
  }

  async function refreshSmartAccountData(chainInfo?: ChainInfo) {
    try {
      if (!activeAddress) {
        return;
      }

      const targets = chainInfo
        ? [chainInfo]
        : Array.from(smartAccounts.values()).map(d => d.chainInfo);

      const updated = new Map(smartAccounts);

      for (const chain of targets) {
        try {
          const addr = await getSmartAccountAddressForChain(
            activeAddress,
            chain,
          );
          const deployed = await isDeployedForChain(activeAddress, chain);

          updated.set(chain.id, {
            chainInfo: chain,
            smartAccountAddress: addr,
            isDeployed: deployed,
            lastUpdated: new Date(),
          });
        } catch (e) {
          console.log(`refresh ${chain.name} error:`, e);
        }
      }

      setSmartAccounts(updated);
    } catch (e) {
      console.log('refreshSmartAccountData error:', e);
    }
  }

  const smartAccount = useMemo(
    () => smartAccounts.get(currentChain.id),
    [smartAccounts, currentChain.id],
  );

  const value: ParticleContextType = {
    activeWalletType,
    activeAddress,
    particleUserInfo,
    isLoading,

    currentChain,
    switchToChain,
    switchToCChain,
    switchToSubnet,

    connect,
    getConnected,
    disconnect,
    sendCode,

    signMessage,

    smartAccounts,
    smartAccount,
    isDeploy,
    getSmartAccountAddress,
    getAllSmartAccounts,
    getSmartAccountForChain,
    refreshSmartAccountData,
  };

  return (
    <ParticleContext.Provider value={value}>
      {children}
    </ParticleContext.Provider>
  );
};

// ---------- hooks ----------
export const useParticle = () => {
  const ctx = useContext(ParticleContext);
  if (!ctx) {
    throw new Error('useParticle must be used within ParticleProvider');
  }
  return ctx;
};

export const useCurrentChainSmartAccount = () => {
  const {currentChain, smartAccounts} = useParticle();
  return smartAccounts.get(currentChain.id);
};
