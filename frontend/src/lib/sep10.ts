import type { WalletState } from '@/types';
import type { WebAuthChallenge } from '@/lib/anchor';

/**
 * Signs a SEP-10 challenge transaction with the connected wallet.
 *
 * SEP-24 anchors that trust authenticated requests (the test anchor and most
 * production anchors) require the account to prove ownership of its address
 * via a signed challenge transaction before accepting a transfer.
 *
 * Freighter returns the signed transaction XDR directly; the signed XDR is
 * submitted back to the anchor (through the backend proxy) in exchange for a
 * JWT.
 */
export async function signSep10Challenge(
  challenge: WebAuthChallenge,
  wallet: WalletState,
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Connect your wallet before signing in with the anchor.');
  }
  if (wallet.provider !== 'freighter') {
    throw new Error(
      'SEP-10 anchor sign-in is currently supported with the Freighter wallet.',
    );
  }

  const freighter = (window as unknown as { freighterApi?: any }).freighterApi;
  if (!freighter?.signTransaction) {
    throw new Error(
      'Freighter wallet not available. Please install the extension to fund or cash out via fiat.',
    );
  }

  const signedTransaction = await freighter.signTransaction(challenge.transaction, {
    networkPassphrase: challenge.network_passphrase,
  });
  if (!signedTransaction) {
    throw new Error('Freighter did not return a signed challenge. Try again.');
  }
  return signedTransaction;
}