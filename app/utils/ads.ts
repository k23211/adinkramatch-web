// Web/fallback stub
import React from 'react';

// Web/fallback stub matching native API shapes to satisfy TypeScript
export const BannerAd: any = () => null;
export const BannerAdSize: any = { BANNER: 'BANNER' };
export const InterstitialAd: any = {
    createForAdRequest: (adUnitId?: string) => ({
        load: () => { },
        show: () => { },
        addAdEventListener: (eventType?: any, callback?: any) => {
            return () => { };
        },
    }),
};
export const AdEventType: any = { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed' };
export const RewardedAd: any = {
    createForAdRequest: (adUnitId?: string) => ({
        load: () => { },
        show: () => { },
        addAdEventListener: (eventType?: any, callback?: any) => {
            return () => { };
        },
    }),
};
export const RewardedAdEventType: any = { LOADED: 'loaded', EARNED_REWARD: 'earned_reward', ERROR: 'error', CLOSED: 'closed' };
export const TestIds: any = { BANNER: 'test-banner-id', INTERSTITIAL: 'test-interstitial-id', REWARDED: 'test-rewarded-id' };