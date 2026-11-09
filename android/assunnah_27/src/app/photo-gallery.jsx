import { StyleSheet, Text, View, SectionList, useColorScheme, TouchableOpacity, Modal, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useState } from 'react';

const CARD_GAP = 12;
const imageCategories = [
  {
    id: 1,
    title: 'মাদ্রাসা ক্যাম্পাস',
    icon: 'business-outline',
    color: '#2563EB',
    images: [
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa1.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa1.jpg'), name: 'মাদ্রাসা ১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa2.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa2.jpg'), name: 'মাদ্রাসা ২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa3.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa3.jpg'), name: 'মাদ্রাসা ৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa4.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa4.jpg'), name: 'মাদ্রাসা ৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa7.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa7.jpg'), name: 'মাদ্রাসা ৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa8.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa8.jpg'), name: 'মাদ্রাসা ৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa9.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa9.jpg'), name: 'মাদ্রাসা ৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa10.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa10.jpg'), name: 'মাদ্রাসা ১০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa11.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa11.jpg'), name: 'মাদ্রাসা ১১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa88.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa88.jpg'), name: 'মাদ্রাসা ৮৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrada5.jpg'), file: require('../../assets/expo.icon/Assets/images/madrada5.jpg'), name: 'মাদ্রাসা ৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa444.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa444.jpg'), name: 'মাদ্রাসা ৪৪৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/madrasa99.jpg'), file: require('../../assets/expo.icon/Assets/images/madrasa99.jpg'), name: 'মাদ্রাসা ৯৯' },
    ],
  },
  {
    id: 7,
    title: 'ড্রোন ভিউ ও এরিয়াল ক্যাম্পাস',
    icon: 'airplane-outline',
    color: '#0284C7',
    images: [
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0285.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0285.jpg'), name: 'ড্রোন দৃশ্য ১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0286.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0286.jpg'), name: 'ড্রোন দৃশ্য ২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0287.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0287.jpg'), name: 'ড্রোন দৃশ্য ৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0288.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0288.jpg'), name: 'ড্রোন দৃশ্য ৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0289.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0289.jpg'), name: 'ড্রোন দৃশ্য ৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0296.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0296.jpg'), name: 'ড্রোন দৃশ্য ৬' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0297.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0297.jpg'), name: 'ড্রোন দৃশ্য ৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0298.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0298.jpg'), name: 'ড্রোন দৃশ্য ৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0299.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0299.jpg'), name: 'ড্রোন দৃশ্য ৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0300.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0300.jpg'), name: 'ড্রোন দৃশ্য ১০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0301.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0301.jpg'), name: 'ড্রোন দৃশ্য ১১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0302.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0302.jpg'), name: 'ড্রোন দৃশ্য ১২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0303.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0303.jpg'), name: 'ড্রোন দৃশ্য ১৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0304.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0304.jpg'), name: 'ড্রোন দৃশ্য ১৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0305.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0305.jpg'), name: 'ড্রোন দৃশ্য ১৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0307.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0307.jpg'), name: 'ড্রোন দৃশ্য ১৬' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0308.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0308.jpg'), name: 'ড্রোন দৃশ্য ১৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0309.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0309.jpg'), name: 'ড্রোন দৃশ্য ১৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0312.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0312.jpg'), name: 'ড্রোন দৃশ্য ১৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0313.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0313.jpg'), name: 'ড্রোন দৃশ্য ২০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0314.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0314.jpg'), name: 'ড্রোন দৃশ্য ২১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0315.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0315.jpg'), name: 'ড্রোন দৃশ্য ২২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0316.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0316.jpg'), name: 'ড্রোন দৃশ্য ২৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0317.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0317.jpg'), name: 'ড্রোন দৃশ্য ২৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0318.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0318.jpg'), name: 'ড্রোন দৃশ্য ২৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0341.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0341.jpg'), name: 'ড্রোন দৃশ্য ২৬' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0350.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0350.jpg'), name: 'ড্রোন দৃশ্য ২৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0351.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0351.jpg'), name: 'ড্রোন দৃশ্য ২৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0352.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0352.jpg'), name: 'ড্রোন দৃশ্য ২৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0353.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0353.jpg'), name: 'ড্রোন দৃশ্য ৩০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dji_0354.jpg'), file: require('../../assets/expo.icon/Assets/images/dji_0354.jpg'), name: 'ড্রোন দৃশ্য ৩১' },
    ],
  },
  {
    id: 8,
    title: 'জামিয়া অ্যালবাম ও স্মৃতিচারণ',
    icon: 'camera-outline',
    color: '#059669',
    images: [
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_01.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_01.jpg'), name: 'ক্যাম্পাস স্মৃতি ১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_02.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_02.jpg'), name: 'ক্যাম্পাস স্মৃতি ২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_03.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_03.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_04.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_04.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_05.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_05.jpg'), name: 'ক্যাম্পাস স্মৃতি ৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_06.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_06.jpg'), name: 'ক্যাম্পাস স্মৃতি ৬' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_07.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_07.jpg'), name: 'ক্যাম্পাস স্মৃতি ৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_08.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_08.jpg'), name: 'ক্যাম্পাস স্মৃতি ৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_09.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_09.jpg'), name: 'ক্যাম্পাস স্মৃতি ৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_10.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_10.jpg'), name: 'ক্যাম্পাস স্মৃতি ১০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_11.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_11.jpg'), name: 'ক্যাম্পাস স্মৃতি ১১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_12.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_12.jpg'), name: 'ক্যাম্পাস স্মৃতি ১২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_13.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_13.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_14.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_14.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_15.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_15.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_16.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_16.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৬' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_17.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_17.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_18.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_18.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_19.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_19.jpg'), name: 'ক্যাম্পাস স্মৃতি ১৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_20.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_20.jpg'), name: 'ক্যাম্পাস স্মৃতি ২০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_21.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_21.jpg'), name: 'ক্যাম্পাস স্মৃতি ২১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_22.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_22.jpg'), name: 'ক্যাম্পাস স্মৃতি ২২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_23.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_23.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_24.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_24.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_25.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_25.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_26.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_26.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৬' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_27.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_27.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_28.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_28.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_29.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_29.jpg'), name: 'ক্যাম্পাস স্মৃতি ২৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_30.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_30.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_31.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_31.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_32.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_32.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_33.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_33.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_34.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_34.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_35.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_35.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_36.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_36.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৬' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_37.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_37.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_38.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_38.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_39.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_39.jpg'), name: 'ক্যাম্পাস স্মৃতি ৩৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_40.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_40.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_41.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_41.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_42.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_42.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_43.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_43.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_44.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_44.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_45.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_45.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৫' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_46.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_46.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৬' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_47.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_47.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৭' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_48.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_48.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৮' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_49.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_49.jpg'), name: 'ক্যাম্পাস স্মৃতি ৪৯' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_50.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_50.jpg'), name: 'ক্যাম্পাস স্মৃতি ৫০' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/jamia_album_51.jpg'), file: require('../../assets/expo.icon/Assets/images/jamia_album_51.jpg'), name: 'ক্যাম্পাস স্মৃতি ৫১' },
    ],
  },
  {
    id: 2,
    title: 'দারস ও শিক্ষা',
    icon: 'school-outline',
    color: '#9333EA',
    images: [
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dars.jpg'), file: require('../../assets/expo.icon/Assets/images/dars.jpg'), name: 'দারস' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dars_adab_01.jpg'), file: require('../../assets/expo.icon/Assets/images/dars_adab_01.jpg'), name: 'আদব দারস' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dars_daura_01.jpg'), file: require('../../assets/expo.icon/Assets/images/dars_daura_01.jpg'), name: 'দওরা দারস ১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dars_daura_2.jpg'), file: require('../../assets/expo.icon/Assets/images/dars_daura_2.jpg'), name: 'দওরা দারস ২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dars_daura_3.jpg'), file: require('../../assets/expo.icon/Assets/images/dars_daura_3.jpg'), name: 'দওরা দারস ৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dars_daura_4.jpg'), file: require('../../assets/expo.icon/Assets/images/dars_daura_4.jpg'), name: 'দওরা দারস ৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dars_ifta_01.jpg'), file: require('../../assets/expo.icon/Assets/images/dars_ifta_01.jpg'), name: 'ইফতা দারস' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/dars_ulum_01.jpg'), file: require('../../assets/expo.icon/Assets/images/dars_ulum_01.jpg'), name: 'উলুম দারস' },
    ],
  },
  {
    id: 3,
    title: 'পরীক্ষা হল',
    icon: 'clipboard-outline',
    color: '#059669',
    images: [
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/exam_hall_01.jpg'), file: require('../../assets/expo.icon/Assets/images/exam_hall_01.jpg'), name: 'পরীক্ষা হল ১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/exam_hall_02.jpg'), file: require('../../assets/expo.icon/Assets/images/exam_hall_02.jpg'), name: 'পরীক্ষা হল ২' },
    ],
  },
  {
    id: 4,
    title: 'বোর্ডিং',
    icon: 'bed-outline',
    color: '#D97706',
    images: [
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/boarding_01.jpg'), file: require('../../assets/expo.icon/Assets/images/boarding_01.jpg'), name: 'বোর্ডিং ১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/boarding_02.jpg'), file: require('../../assets/expo.icon/Assets/images/boarding_02.jpg'), name: 'বোর্ডিং ২' },
    ],
  },
  {
    id: 5,
    title: 'মসজিদ',
    icon: 'moon-outline',
    color: '#EC4899',
    images: [
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/masjid.png'), file: require('../../assets/expo.icon/Assets/images/masjid.png'), name: 'মসজিদ' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/masjid1.png'), file: require('../../assets/expo.icon/Assets/images/masjid1.png'), name: 'মসজিদ ১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/masjid2.png'), file: require('../../assets/expo.icon/Assets/images/masjid2.png'), name: 'মসজিদ ২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/masjid3.png'), file: require('../../assets/expo.icon/Assets/images/masjid3.png'), name: 'মসজিদ ৩' },
    ],
  },
  {
    id: 6,
    title: 'অন্যান্য',
    icon: 'images-outline',
    color: '#DC2626',
    images: [
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/1.jpg'), file: require('../../assets/expo.icon/Assets/images/1.jpg'), name: 'ছবি ১' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/2.jpg'), file: require('../../assets/expo.icon/Assets/images/2.jpg'), name: 'ছবি ২' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/3.jpg'), file: require('../../assets/expo.icon/Assets/images/3.jpg'), name: 'ছবি ৩' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/4.jpg'), file: require('../../assets/expo.icon/Assets/images/4.jpg'), name: 'ছবি ৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/44.jpg'), file: require('../../assets/expo.icon/Assets/images/44.jpg'), name: 'ছবি ৪৪' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/hefz.png'), file: require('../../assets/expo.icon/Assets/images/hefz.png'), name: 'হিফজ' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/muallim.png'), file: require('../../assets/expo.icon/Assets/images/muallim.png'), name: 'মুআল্লিম' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/staf.jpg'), file: require('../../assets/expo.icon/Assets/images/staf.jpg'), name: 'স্টাফ' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/staf1.png'), file: require('../../assets/expo.icon/Assets/images/staf1.png'), name: 'স্টাফ পিএনজি' },
      { thumb: require('../../assets/expo.icon/Assets/images/thumbs/office_01.jpg'), file: require('../../assets/expo.icon/Assets/images/office_01.jpg'), name: 'অফিস' },
    ],
  },
];
const chunkArray = (items, size) => {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

function GalleryImage({ source, label }) {
  return (
    <View style={styles.imageCardContent}>
      <Image
        source={source}
        style={styles.galleryImage}
        resizeMode="cover"
      />
      <View style={styles.imageOverlay}>
        <Text style={styles.imageLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function GalleryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openImage = (image) => {
    setSelectedImage(image);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const gallerySections = imageCategories.map((category) => ({
    ...category,
    data: chunkArray(category.images, 2),
  }));

  const renderImageRow = ({ item: rowImages, section, index }) => (
    <View style={styles.imageRow}>
      {rowImages.map((img, imgIndex) => (
        <TouchableOpacity
          key={`${section.id}-${index}-${imgIndex}`}
          activeOpacity={0.75}
          onPress={() => openImage(img)}
          style={styles.imageCard}
          pointerEvents="box-only"
        >
          <GalleryImage source={img.thumb || img.file} label={img.name} />
        </TouchableOpacity>
      ))}
      {rowImages.length === 1 && <View style={styles.emptyCard} />}
    </View>
  );

  const renderCategoryHeader = ({ section }) => (
    <View style={styles.categoryWrapper}>
      <View style={[styles.categoryHeader, { borderLeftColor: section.color }]}>
        <Ionicons name={section.icon} size={18} color={section.color} />
        <Text style={[styles.categoryTitle, { color: colors.text }]}>{section.title}</Text>
        <Text style={[styles.categoryCount, { color: colors.textMuted }]}>
          {section.images.length}টি
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>জামিয়াতুস সুন্নাহ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>ফটো গ্যালারি</Text>
        </View>
      </View>

      <SectionList
        style={styles.sectionList}
        sections={gallerySections}
        keyExtractor={(item, index) => `${item[0]?.name || 'row'}-${index}`}
        renderSectionHeader={renderCategoryHeader}
        renderItem={renderImageRow}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        scrollEnabled={!modalVisible}
        initialNumToRender={6}
        windowSize={5}
        maxToRenderPerBatch={6}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <View>
            <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
              <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                  <Ionicons name="images" size={36} color={colors.accentBlue} />
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>ফটো গ্যালারি</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  {"জামিয়াতুস সুন্নাহ'র বিরল মুহূর্তের স্মৃতিচিত্র"}
                </Text>
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          <View>
            <View style={[styles.footerCard, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
              <View style={[styles.footerInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="heart" size={20} color={colors.accentEmerald} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  {"জামিয়াতুস সুন্নাহ'র স্মৃতিময় মুহূর্তগুলি ছবির মাধ্যমে উপভোগ করুন"}
                </Text>
              </View>
            </View>
            <View style={{ height: 60 }} />
          </View>
        }
      />

      {/* Full-Screen Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.9)' }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={closeModal}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedImage && (
              <Text style={styles.modalImageName} numberOfLines={1}>
                {selectedImage.name}
              </Text>
            )}
            <View style={{ width: 40 }} />
          </View>

          {/* Image */}
          <View style={styles.modalImageContainer}>
            {selectedImage && (
              <Image
                source={selectedImage.file}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Modal Footer */}
          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalFooterText}>
              ছবিটি দেখতে ট্যাপ করুন • স্ক্রল করে দেখুন
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroOuter: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  heroInner: {
    borderRadius: 21,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  categoryWrapper: {
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryOuter: {
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
  },
  categoryInner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  imageRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: 14,
  },
  emptyCard: {
    flex: 1,
  },
  imageCard: {
    flex: 1,
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: '#0F172A',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  imageCardContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  imageLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerCard: {
    borderRadius: 20,
    padding: 2.5,
    borderWidth: 1,
    marginTop: 8,
  },
  footerInner: {
    borderRadius: 17,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '600',
    flex: 1,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalImage: {
    width: '100%',
    height: '80%',
    borderRadius: 12,
  },
  modalFooter: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
  },
  modalFooterText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
});
