import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useState } from 'react';

// ======================= kitab (68 জন) =======================
const kitabDept = [
  { name: 'মুহিউস সুন্নাহ শাইখুল হাদীস আল্লামা মাহমুদুল হাসান দা.বা.', title: 'শাইখুল হাদীস ও শাইখুল জামিয়া', address: 'মোমেনশাহী', phone: '' },
  { name: 'শাইখুল হাদীস মাওলানা নেয়ামাতুল্লাহ আল ফরিদী', title: 'মুহতামিম', address: 'গোপালগঞ্জ', phone: '01732580023' },
  { name: 'মাওঃ হাবীবুলল্লাহ', title: 'কমিটি ও মুহাদ্দিস', address: 'খুলনা', phone: '01732580024' },
  { name: 'মাওঃ আতাউর রহমান', title: 'কমিটি ও সিনিয়র উস্তাদ', address: 'শরীয়তপুর', phone: '01732580025' },
  { name: 'মাওঃ আসাদুলল্লাহ', title: 'কমিটি ও মুহাদ্দিস', address: 'ফরিদপুর', phone: '01760476670' },
  { name: 'মাওঃ ছিদ্দিকুর রহমান', title: 'কমিটি ও মুহাদ্দিস', address: 'গোপালগঞ্জ', phone: '01718327247' },
  { name: 'মাওঃ আবু বকর সিদ্দীক', title: 'কমিটি ও মুহাদ্দিস', address: 'ফরিদপুর', phone: '' },
  { name: 'মাওঃ আমিনুল হক', title: 'কমিটি ও মুহাদ্দিস', address: 'মাদারীপুর', phone: '01722032832' },
  { name: 'মাওঃ হিদায়াতুলল্লাহ', title: 'মুহাদ্দিস', address: 'ফরিদপুর', phone: '01733268583' },
  { name: 'মাওঃ লুৎফুর রহমান', title: 'মুহাদ্দিস', address: 'গোপালগঞ্জ', phone: '01721644286' },
  { name: 'মাওঃ আব্দুল গাফফার', title: 'মুহাদ্দিস', address: 'ফরিদপুর', phone: '01716259486' },
  { name: 'মাওঃ ইব্রাহিম খলিল', title: 'মুহাদ্দিস', address: 'খুলনা', phone: '01920204867' },
  { name: 'মাওঃ মোশাররফ হুসাইন', title: 'মুহাদ্দিস', address: 'মাদারীপুর', phone: '01714542074' },
  { name: 'মাওঃ ইয়াকুব আলী', title: 'মুহাদ্দিস', address: 'শরীয়তপুর', phone: '01724526850' },
  { name: 'মাওঃ সালমান', title: 'মুহাদ্দিস', address: 'দিনাজপুর', phone: '01741556333' },
  { name: 'মাওঃ ইসহাক আহমাদ', title: 'মুহাদ্দিস', address: 'মোমেনশাহী', phone: '01742842701' },
  { name: 'মাওঃ আতাউর রহমান', title: 'মুহাদ্দিস', address: 'শরীয়তপুর', phone: '01732580025' },
  { name: 'মাওঃ আব্দুল কাদের', title: 'মুহাদ্দিস', address: 'নোয়াখালী', phone: '01915486125' },
  { name: 'মাওঃ নুরুল আমীন', title: 'মুহাদ্দিস', address: 'গাইবান্ধা', phone: '01700872481' },
  { name: 'মাওঃ মুফিজুল ইসলাম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01716521151' },
  { name: 'মাওঃ আব্দুলল্লাহ শাহ', title: 'সহ-নাযেমে তাবলীগ', address: 'তথ্য নেই', phone: '01739954205' },
  { name: 'মাওঃ রাশেদুল ইসলাম', title: 'মুদাররিস', address: 'নোয়াখালী', phone: '01745682855' },
  { name: 'মাওঃ আব্দুলল্লাহ আল মামুন', title: 'মুহাদ্দিস', address: 'পাবনা', phone: '01304125411' },
  { name: 'মাওঃ সাইফ মাহমুদ (আলীনূর)', title: 'মুহাদ্দিস', address: 'ঢাকা/নারায়ণগঞ্জ', phone: '01831911802' },
  { name: 'মাওঃ আবু তালহা', title: 'মুদাররিস', address: 'নড়াইল', phone: '01717463694' },
  { name: 'মাওঃ আফফান হুসাইন', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'গাজিপুর', phone: '01727560249' },
  { name: 'মাওঃ শওকাতুল ইসলাম', title: 'সহ: নাযেমে দারুল ইক্বামা', address: 'খুলনা', phone: '01918607363' },
  { name: 'মাওঃ জামালুদ্দীন', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'গোপালগঞ্জ', phone: '01733128970' },
  { name: 'মাওঃ মনিরম্নল ইসলাম', title: 'সহ: নাযেমে কুতুবখানা', address: 'মাগুরা', phone: '01725928280' },
  { name: 'মাওঃ শামীম উসমান', title: 'মুহাদ্দিস', address: 'বি.বাড়িয়া', phone: '01918436171' },
  { name: 'মাওঃ মুজাহিদুল ইসলাম', title: 'সহ: নাযেমে কুতুবখানা', address: 'ফরিদপুর', phone: '01765586361' },
  { name: 'মাওঃ মুইনুল ইসলাম', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '' },
  { name: 'মাওঃ জসীম উদ্দীন', title: 'নাযেমে ছাত্র পাঠাগার', address: 'গোপালগঞ্জ', phone: '01740513440' },
  { name: 'মাওঃ জোবায়ের আহমদ', title: 'মুদাররিস', address: 'বগুড়া', phone: '01755807791' },
  { name: 'মাওঃ আব্দুর রহমান', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01754308482' },
  { name: 'মাওঃ মাসউদ আনসারী', title: 'মুদাররিস', address: 'টাঙ্গাইল', phone: '01780264496' },
  { name: 'মাওঃ মাসউদুর রহমান', title: 'মুদাররিস', address: 'নারায়নগঞ্জ', phone: '01798645533' },
  { name: 'মাওঃ হাসান শেখ', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'মাদারীপুর', phone: '01779936907' },
  { name: 'মাওঃ জহিরুল ইসলাম', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01775701035' },
  { name: 'মাওঃ শরীফুল ইসলাম নাবীল', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '' },
  { name: 'মাওঃ আব্দুল ওয়াজেদ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01780389036' },
  { name: 'মাওঃ তারেক হোসেন', title: 'মুদাররিস', address: 'লক্ষীপুর', phone: '01828649360' },
  { name: 'মাওঃ আযীমুদ্দীন', title: 'মুদাররিস', address: 'জামালপুর', phone: '01643542158' },
  { name: 'মাওঃ কিফায়াতুলল্লাহ', title: 'মুদাররিস', address: 'রাজবাড়ী', phone: '01751670076' },
  { name: 'মাওঃ ইব্রাহীম খলিল', title: 'মুঈনে তা\'লীমাত', address: 'খুলনা', phone: '01920204867' },
  { name: 'মাওঃ জাকারিয়া', title: 'মুদাররিস', address: 'খুলনা', phone: '01725189086' },
  { name: 'মাওঃ আবু জাফর মিয়া', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01734793940' },
  { name: 'মাওঃ আব্দুলল্লাহ মুহা. সালিহ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01317265946' },
  { name: 'মাওঃ মুস্তাফিজুর রহমান', title: 'সহ- তালীমাত অফিস', address: 'ফরিদপুর', phone: '01300670723' },
  { name: 'মাওঃ আব্দুর রহমান', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01754308482' },
  { name: 'মাওঃ নিয়ামাতুলল্লাহ', title: 'মুদাররিস', address: 'নড়াইল', phone: '01798222386' },
  { name: 'মাওঃ আব্দুল বাতেন', title: 'সহ-নাযেমে ছাত্র পাঠাগার', address: 'শরীয়তপুর', phone: '01760866231' },
  { name: 'মাওঃ মাহবুবুর রহমান', title: 'মুদাররিস', address: 'পটুয়াখালী', phone: '01770682416' },
  { name: 'মাওঃ সাইফুল আলম', title: 'মুদাররিস', address: 'খুলনা', phone: '01766279402' },
  { name: 'মাওঃ ক্বারী যোবায়ের আহমাদ', title: 'মুদাররিস', address: 'বগুড়া', phone: '01755807791' },
  { name: 'মাওঃ গোলাম মোস্তফা', title: 'মুদাররিস (আব্দুল্লাহ মাসুম)', address: 'নেত্রকোনা', phone: '01968660585' },
  { name: 'মাওঃ আব্দুলল্লাহ শেখ', title: 'মুদাররিস', address: 'পিরোজপুর', phone: '01954419900' },
  { name: 'মাওঃ সিরাজুল ইসলাম', title: 'মুদাররিস', address: 'সিরাজগঞ্জ', phone: '01727935370' },
  { name: 'মাওঃ সা'দুলল্লাহ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01310039303' },
  { name: 'মাওঃ শাহাজালাল মুন্সী', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01781402928' },
  { name: 'মাওঃ নাইম হোসেন', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01758561818' },
  { name: 'মাওঃ ফজলুল করীম', title: 'মুয়াজ্জিন', address: 'পঞ্চগড়', phone: '01575427376' },
  { name: 'মাওঃ রাকিবুল ইসলাম', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01827750134' },
  { name: 'মাওঃ মুস্তাফিজুর রহমান', title: 'সহ- তালীমাত অফিস', address: 'ফরিদপুর', phone: '01300670723' },
  { name: 'মাওঃ ইবরাহীম (চাঁদপুর)', title: 'মুহাদ্দিস / উস্তাদ', address: 'তথ্য নেই', phone: '' },
  { name: 'মাওঃ আব্দুলল্লাহ আল মাশহুদ', title: 'মুদাররিস', address: 'পাবনা', phone: '01304125411' },
  { name: 'মাওঃ মুমিনুদ্দীন খান', title: 'মুহাদ্দিস / উস্তাদ', address: 'তথ্য নেই', phone: '' },
  { name: 'মাওঃ জুনায়েদ আহমাদ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01771642988' },
];

// ======================= bangla (12 জন) =======================
const banglaDept = [
  { name: 'মাস্টার শাহ সেকান্দার', title: 'শিক্ষক', address: 'মাদারীপুর', phone: '01729987270' },
  { name: 'মাস্টার আবু সায়েম', title: 'শিক্ষক', address: 'ফরিদপুর', phone: '01729175091' },
  { name: 'শেখ রেজওয়ান হোসেন', title: 'শিক্ষক', address: 'বাগেরহাট', phone: '01720963081' },
  { name: 'খন্দকার সুবাত আলী', title: 'শিক্ষক', address: 'পাবনা', phone: '01875533502' },
  { name: 'মাস্টার বিলায়েত হোসাইন', title: 'শিক্ষক', address: 'ফরিদপুর', phone: '' },
  { name: 'কাজী মিজানুর রহমান', title: 'শিক্ষক', address: 'ফরিদপুর', phone: '01725131253' },
  { name: 'মাস্টার মেহেদী হাসান', title: 'শিক্ষক', address: 'ফরিদপুর', phone: '01789749914' },
  { name: 'মাস্টার খালিদ হাসান', title: 'শিক্ষক', address: 'ফরিদপুর', phone: '01721159609' },
  { name: 'মাস্টার সোহেল রানা', title: 'শিক্ষক', address: 'তথ্য নেই', phone: '' },
  { name: 'মাস্টার আসাদুজ্জামান', title: 'শিক্ষক', address: 'পটুয়াখালী', phone: '01713536624' },
  { name: 'মাস্টার আবু তাহের সরকার', title: 'শিক্ষক', address: 'বাগেরহাট', phone: '' },
  { name: 'মাস্টার মাসুদুর রহমান', title: 'শিক্ষক', address: 'খুলনা', phone: '01912437866' },
];

// ======================= hifz (41 জন) =======================
const hifzDept = [
  { name: 'হাফেজ আবুল হাসান', title: 'হিফয বিভাগীয় প্রধান-১', address: 'পিরোজপুর', phone: '01715224462' },
  { name: 'হাফেজ মাহমুদ আব্বাস', title: 'হিফয বিভাগীয় প্রধান-২', address: 'ফরিদপুর', phone: '01718105168' },
  { name: 'হাফেজ আব্দুর রহমান', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01754308482' },
  { name: 'হাফেজ রফিকুল ইসলাম', title: 'মুদাররিস', address: 'খুলনা', phone: '01729438776' },
  { name: 'হাফেজ আতাউলল্লাহ', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01740347565' },
  { name: 'হাফেজ হুজাইফা', title: 'মুদাররিস', address: 'বরিশাল', phone: '01772802220' },
  { name: 'হাফেজ হফেজ নূরে আলম মাদবর', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01729465416' },
  { name: 'হাফেজ সাইফুল ইসলাম', title: 'মুদাররিস', address: 'রাজবাড়ী', phone: '01717698435' },
  { name: 'হাফেজ সেলিম শেখ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01315980437' },
  { name: 'হাফেজ বিলায়েত হুসাইন', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '' },
  { name: 'হাফেজ আনাছ আহমাদ', title: 'মুদাররিস', address: 'নেত্রকোনা', phone: '01933784494' },
  { name: 'হাফেজ সাদেক হোসাইন', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01760574118' },
  { name: 'হাফেজ আব্দুল কুদ্দুস', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01314943723' },
  { name: 'হাফেজ আব্দুলল্লাহ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01746755724' },
  { name: 'হাফেজ আঃ কাইয়ুম বিশ্বাস', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01819718156' },
  { name: 'হাফেজ আহমাদুলল্লাহ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01723120590' },
  { name: 'হাফেজ সোহাগ মিয়া', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01725657991' },
  { name: 'হাফেজ মুরশিদ আলম', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01906351939' },
  { name: 'হাফেজ আজম শেখ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01797908233' },
  { name: 'হাফেজ রাছেল শেখ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01306698918' },
  { name: 'হাফেজ হানজালা', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01910695926' },
  { name: 'হাফেজ আব্দুর রহমান', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01754308482' },
  { name: 'হাফেজ খালেদ সাইফুলল্লাহ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01660148851' },
  { name: 'হাফেজ ইমরান আহমাদ', title: 'মুদাররিস', address: 'নিলফামারী', phone: '01796473720' },
  { name: 'হাফেজ মুশাররফ হুসাইন', title: 'মুঈনে তা\'লীমাত', address: 'মাদারীপুর', phone: '01714542074' },
  { name: 'হাফেজ সৈয়দ সাইফুল ইসলাম', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01601900312' },
  { name: 'হাফেজ সাইফুল ইসলাম', title: 'মুদাররিস', address: 'রাজবাড়ী', phone: '01717698435' },
  { name: 'হাফেজ ইস্রাফিল', title: 'মুদাররিস', address: 'শরীয়তপুর', phone: '01932848887' },
  { name: 'হাফেজ ইদ্রিস', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01843273751' },
  { name: 'হাফেজ আরাফাত হোসেন হোজাইফা', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01306799712' },
  { name: 'হাফেজ জাহিদুল ইসলাম সাইম', title: 'মুদাররিস', address: 'ময়মনসিংহ', phone: '01881010149' },
  { name: 'হাফেজ জিহাদ হাসান', title: 'মুদাররিস', address: 'ঢাকা', phone: '01818208583' },
  { name: 'হাফেজ হাসান', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'মাদারীপুর', phone: '01779936907' },
  { name: 'হাফেজ রমজান আলী', title: 'মুদাররিস', address: 'তথ্য নেই', phone: '' },
  { name: 'হাফেজ সাইফুল ইসলাম', title: 'মুদাররিস', address: 'রাজবাড়ী', phone: '01717698435' },
  { name: 'হাফেজ ওমর ফারুক', title: 'মুদাররিস', address: 'তথ্য নেই', phone: '' },
  { name: 'হাফেজ হাফিজুর রহমান খান', title: 'মুদাররিস', address: 'তথ্য নেই', phone: '' },
  { name: 'হাফেজ আসাদুলল্লাহ খান', title: 'নাযেমে দারুল ইক্বামা', address: 'ফরিদপুর', phone: '01760476670' },
  { name: 'হাফেজ সালমান শেখ', title: 'নাযেমে মসজিদ', address: 'দিনাজপুর', phone: '01741556333' },
  { name: 'হাফেজ রহমাতুলল্লাহ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01723120590' },
  { name: 'হাফেজ আব্দুল হাকিম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01779989962' },
];

// ======================= board (7 জন) =======================
const boardDept = [
  { name: 'কারী আব্দুস সালাম', title: 'বোর্ড বিভাগীয় প্রধান', address: 'শরীয়তপুর', phone: '01752143176' },
  { name: 'কারী আতিকুর রহমান খান', title: 'জিম্মাদার, বোর্ড বিভাগ', address: 'পিরোজপুর', phone: '01722423266' },
  { name: 'কারী বশির আহমাদ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01703222332' },
  { name: 'কারী আজিজুল হক শিবচর', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01727124291' },
  { name: 'কারী রাকিবুল ইসলাম', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01827750134' },
  { name: 'কারী হিলাল উদ্দিন', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01913202482' },
  { name: 'কারী আবু হানীফ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01733949814' },
];

// ======================= najera (25 জন) =======================
const najeraDept = [
  { name: 'কারী মুহাম্মাদ হাসান', title: 'মুদাররিস', address: 'তথ্য নেই', phone: '' },
  { name: 'কারী শহিদুল ইসলাম', title: 'মুদাররিস', address: 'সিরাজগঞ্জ', phone: '01715283727' },
  { name: 'কারী ফয়জুলল্লাহ', title: 'নাযেরা বিভাগীয় প্রধান', address: 'ফরিদপুর', phone: '01321184011' },
  { name: 'কারী কেফায়েতুলল্লাহ', title: 'মুদাররিস', address: 'রাজবাড়ী', phone: '01751670076' },
  { name: 'কারী শোয়াইব হুসাইন', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01710241031' },
  { name: 'কারী শহিদুল ইসলাম', title: 'মুদাররিস', address: 'সিরাজগঞ্জ', phone: '01715283727' },
  { name: 'কারী বেলাল উদ্দিন', title: 'মুদাররিস', address: 'নড়াইল', phone: '01714996680' },
  { name: 'কারী মুহাম্মাদুলল্লাহ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01720282089' },
  { name: 'কারী ইব্রাহীম খলিলুলল্লাহ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01773150231' },
  { name: 'কারী ইকবাল মীর', title: 'মুদাররিস', address: 'মোমেনশাহী', phone: '01982867463' },
  { name: 'কারী আজিজুল হক', title: 'মুদাররিস', address: 'মোমেনশাহী', phone: '01727124291' },
  { name: 'কারী আবু ইউসুফ', title: 'মুদাররিস', address: 'মোমেনশাহী', phone: '01916153939' },
  { name: 'কারী মফিজুল ইসলাম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01716521151' },
  { name: 'কারী আব্দুলল্লাহ হাওলাদার', title: 'মুদাররিস', address: 'বরিশাল', phone: '01873384097' },
  { name: 'কারী শামিম হোসেন', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01312278059' },
  { name: 'কারী শাহ আলম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01741687953' },
  { name: 'কারী অলিউলল্লাহ মিয়া', title: 'মুদাররিস', address: 'তথ্য নেই', phone: '' },
  { name: 'কারী জুনায়েত হোসাইন', title: 'মুদাররিস', address: 'তথ্য নেই', phone: '' },
  { name: 'কারী আনোয়ার শেখ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01783302452' },
  { name: 'কারী মানিক শরীফ', title: 'মুদাররিস', address: 'তথ্য নেই', phone: '' },
  { name: 'কারী আঃ রাজ্জাক বাওয়ালী', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01913039325' },
  { name: 'কারী আজীম মিয়া', title: 'মুদাররিস', address: 'তথ্য নেই', phone: '' },
  { name: 'কারী আব্দুর রহীম', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01754308482' },
  { name: 'কারী মাতলুবুর রহমান', title: 'মুদাররিস', address: 'পটুয়াখালী', phone: '01770682416' },
  { name: 'কারী তরিকুল ইসলাম', title: 'মুদাররিস', address: 'খুলনা', phone: '01729438776' },
];

// ======================= hisab (4 জন) =======================
const hisabDept = [
  { name: 'মোঃ ইলিয়াছ হুসাইন', title: 'হিসাব রক্ষক', address: 'শরীয়তপুর', phone: '01732580027' },
  { name: 'মাওঃ মাহবুবুর রহমান', title: 'সহ-হিসাব রক্ষক', address: 'পটুয়াখালী', phone: '01770682416' },
  { name: 'মাওঃ ওয়ালী উলল্লাহ', title: 'সহ-হিসাব রক্ষক', address: 'গোপালগঞ্জ', phone: '01732580028' },
  { name: 'মাওঃ আসলাম শেখ', title: 'সহ-হিসাব রক্ষক', address: 'গোপালগঞ্জ', phone: '01732580029' },
];

// ======================= daftar (2 জন) =======================
const daftarDept = [
  { name: 'মাস্টার জাহিদ মুর্শেদ', title: 'কম্পিউটার অপারেটর', address: 'ফরিদপুর', phone: '01720581930' },
  { name: 'সৌরভ হোসেন নোমান', title: 'সহ-কম্পিউটার অপারেটর', address: 'তথ্য নেই', phone: '' },
];

// ======================= khadem (11 জন) =======================
const khademDept = [
  { name: 'সিরাজুল ইসলাম', title: 'বিদ্যুৎ মিস্ত্রী', address: 'সিরাজগঞ্জ', phone: '01727935370' },
  { name: 'আব্দুল কুদ্দুস', title: 'বিদ্যুৎ মিস্ত্রী', address: 'গোপালগঞ্জ', phone: '01314943723' },
  { name: 'নাঈম হোসেন', title: 'সহ-বিদ্যুৎ মিস্ত্রী', address: 'বরিশাল', phone: '01757160334' },
  { name: 'শাহীন হোসেন', title: 'সহ-বিদ্যুৎমিস্ত্রী', address: 'বরিশাল', phone: '01608569348' },
  { name: 'হেলাল কাজী', title: 'নির্মাণ সহকারী', address: 'তথ্য নেই', phone: '' },
  { name: 'মাহবুব আলম', title: 'পিওন', address: 'পটুয়াখালী', phone: '01726730284' },
  { name: 'মুশফিকুর রহমান', title: 'তালীমাত অফিস সহকারী', address: 'ফরিদপুর', phone: '01300670723' },
  { name: 'আব্দুল খালেক দেওয়ান', title: 'মসজিদ খাদেম', address: 'মাদারীপুর', phone: '01733519924' },
  { name: 'আব্দুল মালেক মাদবর', title: 'মসজিদ খাদেম', address: 'নোয়াখালী', phone: '01915486125' },
  { name: 'রাকিব মিয়া', title: 'মসজিদ খাদেম', address: 'মাদারীপুর', phone: '01975405944' },
  { name: 'রহমাতুলল্লাহ শেখ', title: 'খাদেম', address: 'তথ্য নেই', phone: '' },
];

// ======================= boarding (34 জন) =======================
const boardingDept = [
  { name: 'নুরুল আলম শিকদার', title: 'বোর্ডিং ম্যানেজার', address: 'নড়াইল', phone: '01761719643' },
  { name: 'কারী আনোয়ার মোলল্লা', title: 'সহ-বোর্ডিং ম্যানেজার', address: 'গোপালগঞ্জ', phone: '01760476673' },
  { name: 'মাওঃ আব্দুল মতিন', title: 'সহ-বোর্ডিং ম্যানেজার', address: 'কুড়িগ্রাম', phone: '01798978898' },
  { name: 'মাওঃ মাসুদুর রহমান', title: 'সহ-বোর্ডিং ম্যানেজার', address: 'খুলনা', phone: '01912437866' },
  { name: 'আব্দুল মজিদ বেপারী', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01735790340' },
  { name: 'আলমগীর মোলল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01749027690' },
  { name: 'হারুন মুন্সী', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01739840167' },
  { name: 'হানিফ ফকির', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01714825995' },
  { name: 'সলেমান মুনসী', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01737078727' },
  { name: 'বাবলু ফকির', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01749133907' },
  { name: 'সুমন মাতুব্বর', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01754113075' },
  { name: 'সারেজান মোলল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01746184474' },
  { name: 'আজমির ফকির', title: 'বাবুর্চি', address: 'গোপালগঞ্জ', phone: '01307182690' },
  { name: 'জিয়া উদ্দিন', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01725121545' },
  { name: 'জহিরুল ইসলাম মিথুন', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01726421690' },
  { name: 'শহিদুল শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01745918307' },
  { name: 'সরোয়ার মোলল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01933602395' },
  { name: 'ইলিয়াছ শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01729600240' },
  { name: 'রওশন মোলল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01879469993' },
  { name: 'আইয়ুব আলী শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01778781765' },
  { name: 'জয়নাল মোলল্লা', title: 'বাবুর্চি', address: 'শরীয়তপুর', phone: '01998065564' },
  { name: 'অয়েচ কুরুনী', title: 'বাবুর্চি', address: 'খুলনা', phone: '01740902321' },
  { name: 'আবু বক্কার', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '' },
  { name: 'রাজু শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01755150977' },
  { name: 'তোরাব আলী', title: 'বাবুর্চি', address: 'গোপালগঞ্জ', phone: '01706103269' },
  { name: 'বাবুল বেপারী', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01735188691' },
  { name: 'আব্দুল আলিম', title: 'বাবুর্চি', address: 'খুলনা', phone: '01967189866' },
  { name: 'কানু বিশ্বাস', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01764691498' },
  { name: 'মিজানুর রহমান মুন্সি', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01734839876' },
  { name: 'মানিক সরদার', title: 'বাবুর্চি', address: 'তথ্য নেই', phone: '' },
  { name: 'আকুব্বর মোলল্লা', title: 'বাবুর্চি', address: 'তথ্য নেই', phone: '' },
  { name: 'শামীম মাতুব্বর', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01753686811' },
  { name: 'শাহাদাত ফরাজী', title: 'হেলপার', address: 'মাদারীপুর', phone: '01775085476' },
  { name: 'বেলায়েত হোসেন', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01863501682' },
];

// ======================= security (6 জন) =======================
const securityDept = [
  { name: 'আব্দুল কাদির মোড়ল', title: 'সিকিউরিটি', address: 'মাদারীপুর', phone: '01955777009' },
  { name: 'রবিউল ইসলাম', title: 'সিকিউরিটি', address: 'খুলনা', phone: '01955653181' },
  { name: 'কবির মিয়া', title: 'সিকিউরিটি', address: 'গোপালগঞ্জ', phone: '01722070673' },
  { name: 'আব্দুল করিম শেখ', title: 'সিকিউরিটি', address: 'খুলনা', phone: '01853101080' },
  { name: 'ইমাম আল হাফীজ', title: 'সিকিউরিটি', address: 'গোপালগঞ্জ', phone: '01730953750' },
  { name: 'ফরহাদ শেখ', title: 'সিকিউরিটি', address: 'গোপালগঞ্জ', phone: '01967732460' },
];

// ======================= cleaner (3 জন) =======================
const cleanerDept = [
  { name: 'মোস্তফা শেখ', title: 'ক্লিনার', address: 'খুলনা', phone: '01799341632' },
  { name: 'ওবায়দুলল্লাহ', title: 'ক্লিনার', address: 'খুলনা', phone: '01904918226' },
  { name: 'ফারুক শেখ', title: 'ক্লিনার', address: 'খুলনা', phone: '01996898951' },
];

// ======================= বিভাগ কনফিগারেশন =======================
const teacherDepartments = [
  { id: 1, title: 'কিতাব বিভাগ', icon: 'book-outline', color: '#2563EB', colorBg: 'blueCardBg', colorBorder: 'blueCardBorder', data: kitabDept },
  { id: 2, title: 'বাংলা বিভাগ', icon: 'language-outline', color: '#9333EA', colorBg: 'purpleCardBg', colorBorder: 'purpleCardBorder', data: banglaDept },
  { id: 3, title: 'হিফজ বিভাগ', icon: 'bookmarks-outline', color: '#059669', colorBg: 'emeraldCardBg', colorBorder: 'emeraldCardBorder', data: hifzDept },
  { id: 4, title: 'বোর্ড বিভাগ', icon: 'business-outline', color: '#D97706', colorBg: 'amberCardBg', colorBorder: 'amberCardBorder', data: boardDept },
  { id: 5, title: 'নাজেরা বিভাগ', icon: 'eye-outline', color: '#EC4899', colorBg: 'redCardBg', colorBorder: 'redCardBorder', data: najeraDept },
];

const staffDepartments = [
  { id: 6, title: 'হিসাব বিভাগ', icon: 'calculator-outline', color: '#0891B2', colorBg: 'cyanCardBg', colorBorder: 'cyanCardBorder', data: hisabDept },
  { id: 7, title: 'দফতরে তা\'লীমাত', icon: 'folder-open-outline', color: '#7C3AED', colorBg: 'violetCardBg', colorBorder: 'violetCardBorder', data: daftarDept },
  { id: 8, title: 'খাদেম ও টেকনিশিয়ান', icon: 'home-outline', color: '#DC2626', colorBg: 'roseCardBg', colorBorder: 'roseCardBorder', data: khademDept },
  { id: 9, title: 'বোর্ডিং বিভাগ', icon: 'restaurant-outline', color: '#EA580C', colorBg: 'orangeCardBg', colorBorder: 'orangeCardBorder', data: boardingDept },
  { id: 10, title: 'সিকিউরিটি', icon: 'shield-checkmark-outline', color: '#4F46E5', colorBg: 'indigoCardBg', colorBorder: 'indigoCardBorder', data: securityDept },
  { id: 11, title: 'ক্লিনার ও অন্যান্য', icon: 'trash-outline', color: '#65A30D', colorBg: 'limeCardBg', colorBorder: 'limeCardBorder', data: cleanerDept },
];

export default function MudarrisWoMolazimScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('teachers');

  const getColorBg = (key) => colors[key] || colors.blueCardBg;
  const getColorBorder = (key) => colors[key.replace('Bg', 'Border')] || colors.blueCardBorder;

  const currentDepartments = activeTab === 'teachers' ? teacherDepartments : staffDepartments;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>মুদাররিস ও মোলাঝিম</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>শিক্ষক ও কর্মীবৃন্দ</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { paddingHorizontal: 16 }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'teachers' && { backgroundColor: colors.accentEmerald, borderColor: colors.accentEmerald },
            { borderColor: colors.inputBorder, backgroundColor: activeTab === 'teachers' ? colors.accentEmerald : colors.inputBg },
          ]}
          onPress={() => setActiveTab('teachers')}
        >
          <Ionicons name="people" size={16} color={activeTab === 'teachers' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'teachers' ? '#fff' : colors.textSecondary }]}>
            মুদাররিসিন ({teacherDepartments.reduce((s, d) => s + d.data.length, 0)})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'staff' && { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
            { borderColor: colors.inputBorder, backgroundColor: activeTab === 'staff' ? colors.accentBlue : colors.inputBg },
          ]}
          onPress={() => setActiveTab('staff')}
        >
          <Ionicons name="briefcase" size={16} color={activeTab === 'staff' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'staff' ? '#fff' : colors.textSecondary }]}>
            মোলাঝিমিন ({staffDepartments.reduce((s, d) => s + d.data.length, 0)})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroOuter, { backgroundColor: activeTab === 'teachers' ? colors.emeraldCardBg : colors.blueCardBg, borderColor: activeTab === 'teachers' ? colors.emeraldCardBorder : colors.blueCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${activeTab === 'teachers' ? colors.accentEmerald : colors.accentBlue}15`, borderColor: `${activeTab === 'teachers' ? colors.accentEmerald : colors.accentBlue}30` }]}>
              <Ionicons name={activeTab === 'teachers' ? 'people' : 'briefcase'} size={36} color={activeTab === 'teachers' ? colors.accentEmerald : colors.accentBlue} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {activeTab === 'teachers' ? 'মুদাররিসিন' : 'মোলাঝিমিন'}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'teachers' ? 'জামিয়ার শিক্ষকবৃন্দ' : 'জামিয়ার কর্মীবৃন্দ'}
            </Text>
          </View>
        </View>

        {/* Department Sections */}
        {currentDepartments.map((dept) => (
          <View key={dept.id}>
            <View style={[styles.deptHeader, { borderLeftColor: dept.color }]}>
              <Ionicons name={dept.icon} size={18} color={dept.color} />
              <Text style={[styles.deptTitle, { color: colors.text }]}>{dept.title}</Text>
              <Text style={[styles.deptCount, { color: colors.textSecondary }]}>({dept.data.length} জন)</Text>
            </View>

            {dept.data.map((person, index) => (
              <View key={index} style={styles.sectionWrapper}>
                <View
                  style={[
                    styles.sectionOuterCard,
                    { backgroundColor: getColorBg(dept.colorBg), borderColor: getColorBorder(dept.colorBorder) },
                  ]}
                >
                  <View
                    style={[styles.sectionInnerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  >
                    <View style={styles.personRow}>
                      <View style={[styles.avatarSmall, { backgroundColor: `${dept.color}15`, borderColor: `${dept.color}30` }]}>
                        <Ionicons name="person" size={16} color={dept.color} />
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
                        <Text style={[styles.personTitle, { color: dept.color }]}>{person.title}</Text>
                        <Text style={[styles.personAddress, { color: colors.textMuted }]}>📍 {person.address}</Text>
                      </View>
                      {person.phone ? (
                        <TouchableOpacity
                          style={[styles.callBtn, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}
                          onPress={() => Linking.openURL(`tel:${person.phone}`)}
                        >
                          <Ionicons name="call" size={16} color={colors.accentEmerald} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Bottom spacing */}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTextContainer: { flex: 1 },
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
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  heroOuter: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#059669',
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
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  deptTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  deptCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionWrapper: { marginBottom: 8 },
  sectionOuterCard: {
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
  },
  sectionInnerCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInfo: { flex: 1 },
  personName: {
    fontSize: 13,
    fontWeight: '800',
  },
  personTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  personAddress: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});