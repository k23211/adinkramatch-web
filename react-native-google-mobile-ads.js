// Web stub for react-native-google-mobile-ads
// This file is used on web to prevent bundler crashes

export const RewardedAd = {
    createForAdRequest: () => ({
        load: () => { },
        show: () => { },
        addAdEventListener: () => () => { },
    }),
};

export const RewardedAdEventType = {
    LOADED: 'loaded',
    EARNED_REWARD: 'earned_reward',
    CLOSED: 'closed',
};

export const TestIds = {
    REWARDED: 'test-rewarded',
    BANNER: 'test-banner',
    INTERSTITIAL: 'test-interstitial',
};

export const BannerAd = () => null;
export const BannerAdSize = {};
export const InterstitialAd = { createForAdRequest: () => ({}) };
export const AppOpenAd = { createForAdRequest: () => ({}) };
export const MaxAdContentRating = {};
export const MobileAds = () => ({});

export default {};