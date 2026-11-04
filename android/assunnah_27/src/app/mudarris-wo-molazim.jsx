import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useState } from 'react';

// ======================= কিতাব বিভাগ (৬৫ জন) =======================
const kitabDept = [
  { name: 'মুহিউস সুন্নাহ শাইখুল হাদীস আল্লামা মাহমুদুল হাসান দা.বা.', title: 'শাইখুল হাদীস ও শাইখুল জামিয়া', address: 'মোমেনশাহী', phone: '' },
  { name: 'শাইখুল হাদীস মাওলানা নেয়ামাতুল্লাহ আল ফরিদী', title: 'মুহতামিম', address: 'গোপালগঞ্জ', phone: '01732580023' },
  { name: 'শাইখুল হাদীস আল্লামা আব্দুল গাফফার দা.বা.', title: 'শাইখুল হাদীস', address: 'ফরিদপুর', phone: '01716259486' },
  { name: 'মাওলানা হাবীবুল্লাহ', title: 'নাযেমে তা\'লীমাত', address: 'খুলনা', phone: '01732580024' },
  { name: 'মাওলানা আছাদুল্লাহ', title: 'নাযেমে দারুল ইক্বামা', address: 'ফরিদপুর', phone: '01760476670' },
  { name: 'মাওলানা আতাউর রহমান', title: 'নাযেমে তামীরাত', address: 'শরীয়তপুর', phone: '01732580025' },
  { name: 'মাওলানা আবু বকর ছিদ্দিক', title: 'সহ: নাযেমে দারুল ইক্বামা', address: 'নেত্রকোনা', phone: '01913379742' },
  { name: 'মাওলানা হিদায়াতুল্লাহ', title: 'নাযেমে দাওয়াতুল হজ্ব', address: 'ফরিদপুর', phone: '01733268583' },
  { name: 'মাওলানা আমীনুল হক', title: 'সহ: নাযেমে দারুল ইক্বামা', address: 'মাদারীপুর', phone: '01722032832' },
  { name: 'মাওলানা ছিদ্দীকুর রহমান', title: 'নাযেমে কুতুবখানা', address: 'গোপালগঞ্জ', phone: '01718327247' },
  { name: 'মাওলানা লুৎফুর রহমান', title: 'মুঈনে তা\'লীমাত', address: 'গোপালগঞ্জ', phone: '01721644286' },
  { name: 'মাওলানা মুশাররফ হুসাইন', title: 'মুঈনে তা\'লীমাত', address: 'মাদারীপুর', phone: '01714542074' },
  { name: 'মাওলানা ইব্রাহীম খলিল', title: 'মুঈনে তা\'লীমাত', address: 'খুলনা', phone: '01920204867' },
  { name: 'মাওলানা আব্দুল কাদির', title: 'মুহাদ্দিস', address: 'নোয়াখালী', phone: '01915486125' },
  { name: 'মাওলানা ইয়াকুব আলী', title: 'নাযেমে কালেকশন', address: 'শরীয়তপুর', phone: '01724526850' },
  { name: 'মাওলানা আতাউর রহমান (মাদারীপুর)', title: 'মুহাদ্দিস', address: 'মাদারীপুর', phone: '01733160119' },
  { name: 'মাওলানা সালমান', title: 'নাযেমে মসজিদ', address: 'দিনাজপুর', phone: '01741556333' },
  { name: 'মাওলানা ইসহাক আহমাদ', title: 'সহ, নাযেমে মসজিদ', address: 'মোমেনশাহী', phone: '01742842701' },
  { name: 'মাওলানা নুরুল আমীন', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'গাইবান্ধা', phone: '01700872481' },
  { name: 'মাওলানা মুহা: শামীম উসমান', title: 'মুহাদ্দিস', address: 'বি.বাড়িয়া', phone: '01918436171' },
  { name: 'মাওলানা মুফীযুল ইসলাম', title: 'নাযেমে তাবলীগ', address: 'চাঁদপুর', phone: '01860765213' },
  { name: 'মাওঃ সাইফ মাহমুদ', title: 'মুহাদ্দিস', address: 'ঢাকা/নারায়ণগঞ্জ', phone: '01831911802' },
  { name: 'মাওলানা শওকতুল ইসলাম', title: 'সহ: নাযেমে দারুল ইক্বামা', address: 'খুলনা', phone: '01918607363' },
  { name: 'মাওলানা আবু তলহা', title: 'মুদাররিস', address: 'নড়াইল', phone: '01717463694' },
  { name: 'মাওলানা আব্দুল্লাহ শাহ', title: 'সহ-নাযেমে তাবলীগ', address: 'তথ্য নেই', phone: '01739954205' },
  { name: 'মাওলানা রাশেদুল ইসলাম', title: 'মুদাররিস', address: 'নোয়াখালী', phone: '01745682855' },
  { name: 'মাওলানা আব্দুল্লাহ আল মামুন', title: 'মুদাররিস', address: 'পাবনা', phone: '01304125411' },
  { name: 'মাওলানা মুইনুল ইসলাম', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '' },
  { name: 'মাওলানা জামালুদ্দীন', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'গোপালগঞ্জ', phone: '01733128970' },
  { name: 'মাওলানা মুনীরুল ইসলাম', title: 'সহ: নাযেমে কুতুবখানা', address: 'মাগুরা', phone: '01725928280' },
  { name: 'মাওলানা মুজাহিদুল ইসলাম', title: 'সহ: নাযেমে কুতুবখানা', address: 'ফরিদপুর', phone: '01765586361' },
  { name: 'মাওলানা যুবায়ের আহমাদ', title: 'মুদাররিস', address: 'বগুড়া', phone: '01755807791' },
  { name: 'মাওলানা গোলাম মোস্তফা', title: 'মুদাররিস (আব্দুল্লাহ মাসুম)', address: 'নেত্রকোনা', phone: '01968660585' },
  { name: 'মাওলানা আফফান হুসাইন', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'গাজিপুর', phone: '01727560249' },
  { name: 'মাওলানা মাসউদুর রহমান', title: 'মুদাররিস', address: 'নারায়নগঞ্জ', phone: '01798645533' },
  { name: 'মাওলানা হাসান শেখ', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'মাদারীপুর', phone: '01779936907' },
  { name: 'মাওলানা জহিরুল ইসলাম', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01775701035' },
  { name: 'মাওলানা খালেদ সাইফুল্লাহ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01660148851' },
  { name: 'মাওলানা জসিম উদ্দীন', title: 'নাযেমে ছাত্র পাঠাগার', address: 'গোপালগঞ্জ', phone: '01740513440' },
  { name: 'মাওলানা আব্দুল ওয়াজেদ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01780389036' },
  { name: 'মাওলানা আযীমুদ্দীন', title: 'মুদাররিস', address: 'জামালপুর', phone: '01643542158' },
  { name: 'মাওলানা কিফায়াতুল্লাহ', title: 'মুদাররিস', address: 'রাজবাড়ী', phone: '01751670076' },
  { name: 'মাওলানা তারেক হুসাইন', title: 'মুদাররিস', address: 'লক্ষীপুর', phone: '01828649360' },
  { name: 'মাওলানা শরিফুল ইসলাম নাবিল', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '' },
  { name: 'মাওলানা আব্দুল্লাহ সালেহ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01317265946' },
  { name: 'মাওলানা আব্দুর রহমান', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01754308482' },
  { name: 'মাওলানা সাইফুল্লাহ', title: 'মুদাররিস', address: 'হবিগঞ্জ', phone: '01766362855' },
  { name: 'মাওলানা ইবরাহীম খলিল', title: 'মুদাররিস', address: 'মুন্সীগঞ্জ', phone: '01787826774' },
  { name: 'মাওলানা আব্দুল বাতেন', title: 'সহ-নাযেমে ছাত্র পাঠাগার', address: 'শরীয়তপুর', phone: '01760866231' },
  { name: 'মাওলানা আবু জাফর', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01734793940' },
  { name: 'মাওলানা যাকারিয়া', title: 'মুদাররিস', address: 'খুলনা', phone: '01725189086' },
  { name: 'মাওলানা নাসিরুদ্দীন', title: 'মুদাররিস', address: 'মোমেনশাহী', phone: '01865111264' },
  { name: 'মাওলানা মাহবুবুর রহমান', title: 'মুদাররিস', address: 'পটুয়াখালী', phone: '01770682416' },
  { name: 'মাওলানা আব্দুল্লাহ শেখ', title: 'মুদাররিস', address: 'পিরোজপুর', phone: '01954419900' },
  { name: 'মাওলানা নেয়ামাতুল্লাহ', title: 'মুদাররিস', address: 'নড়াইল', phone: '01798222386' },
  { name: 'মাওলানা মাসউদ আনছারী', title: 'মুদাররিস', address: 'টাঙ্গাইল', phone: '01780264496' },
  { name: 'মাওলানা সাইফুল আলম', title: 'মুদাররিস', address: 'খুলনা', phone: '01766279402' },
  { name: 'মাওলানা ফজলুল করিম', title: 'মুদাররিস', address: 'পঞ্চগড়', phone: '01575427376' },
  { name: 'মাওলানা যুবায়ের আহমাদ-গাইবান্ধা', title: 'মুদাররিস', address: 'গাইবান্ধা', phone: '01764312753' },
  { name: 'মাওঃ আব্দুর রহমান ফরিদপুর', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01782937630' },
  { name: 'মাওঃ রাকিবুল ইসলাম', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01827750134' },
  { name: 'মাওঃ সিরাজুল ইসলাম', title: 'মুদাররিস', address: 'সিরাজগঞ্জ', phone: '01727935370' },
  { name: "মাওঃ সা'দুল্লাহ", title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01310039303' },
  { name: 'মাওঃ শাহাজালাল', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01781402928' },
  { name: 'মাওঃ নাইম হোসেন', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01758561818' },
];

// ======================= বাংলা বিভাগ (১২ জন) =======================
const banglaDept = [
  { name: 'মাস্টার শাহ সেকান্দার', title: 'শিক্ষক কিতাব বিভাগ', address: 'মাদারীপুর', phone: '01729987270' },
  { name: 'মাস্টার আবু সায়েম', title: 'শিক্ষক কিতাব বিভাগ', address: 'ফরিদপুর', phone: '01729175091' },
  { name: 'মাস্টার রেজওয়ান শেখ', title: 'শিক্ষক কিতাব বিভাগ', address: 'বাগেরহাট', phone: '01720963081' },
  { name: 'মাস্টার মীযানুর রহমান', title: 'শিক্ষক কিতাব বিভাগ', address: 'ফরিদপুর', phone: '01725131253' },
  { name: 'মাস্টার সুবাত আলী', title: 'শিক্ষক কিতাব বিভাগ', address: 'পাবনা', phone: '01875533502' },
  { name: 'মাস্টার সুহাইল', title: 'শিক্ষক কিতাব বিভাগ', address: 'খুলনা', phone: '01737787045' },
  { name: 'মাস্টার বেলায়েত হুসাইন', title: 'শিক্ষক কিতাব বিভাগ', address: 'ফরিদপুর', phone: '01863501682' },
  { name: 'মাস্টার মাহদী হাসান', title: 'শিক্ষক কিতাব বিভাগ', address: 'ফরিদপুর', phone: '01789749914' },
  { name: 'মাস্টার খালিদ হাসান', title: 'শিক্ষক কিতাব বিভাগ', address: 'ফরিদপুর', phone: '01721159609' },
  { name: 'মাস্টার আসাদুজ্জামান', title: 'শিক্ষক কিতাব বিভাগ', address: 'পটুয়াখালী', phone: '01713536624' },
  { name: 'মাস্টার মাসুদুর রহমান', title: 'শিক্ষক কিতাব বিভাগ', address: 'খুলনা', phone: '01912437866' },
  { name: 'মাস্টার আবু তাহের (সরকার)', title: 'শিক্ষক কিতাব বিভাগ', address: 'বাগেরহাট', phone: '' },
];

// ======================= হিফজ বিভাগ (৩৮ জন) =======================
const hifzDept = [
  { name: 'হাফেজ আবুল হাসান', title: 'জিম্মাদার, হিফয বিভাগ', address: 'পিরোজপুর', phone: '01715224462' },
  { name: 'হাফেজ মাহমুদ আব্বাস', title: 'সহ.জিম্মাদার, হিফয বিভাগ', address: 'ফরিদপুর', phone: '01718105168' },
  { name: 'হাফেজ আব্দুর রহমান', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01719120878' },
  { name: 'হাফেজ রফিকুল ইসলাম', title: 'মুদাররিস', address: 'খুলনা', phone: '01729438776' },
  { name: 'হাফেজ হুজাইফা', title: 'মুদাররিস', address: 'বরিশাল', phone: '01772802220' },
  { name: 'হাফেজ আতাউল্লাহ', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01740347565' },
  { name: 'হাফেজ মিজান', title: 'মুদাররিস', address: 'কুমিল্লা', phone: '01816167964' },
  { name: 'হাফেজ আবু বকর সিদ্দিক', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '' },
  { name: 'হাফেজ নূরে আলম মাদবর', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01729465416' },
  { name: 'হাফেজ সাইফুল ইসলাম', title: 'মুদাররিস', address: 'রাজবাড়ী', phone: '01717698435' },
  { name: 'হাফেজ সেলিম শেখ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01315980437' },
  { name: 'হাফেজ বিলায়েত হুসাইন', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '' },
  { name: 'হাফেজ আনাছ আহমাদ', title: 'মুদাররিস', address: 'নেত্রকোনা', phone: '01933784494' },
  { name: 'হাফেজ সাদেক হোসাইন', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01760574118' },
  { name: 'হাফেজ সোহাগ মিয়া', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01725657991' },
  { name: 'হাফেজ আব্দুল কুদ্দুস', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01314943723' },
  { name: 'হাফেজ মুরশিদ আলম', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01906351939' },
  { name: 'হাফেজ আব্দুল্লাহ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01746755724' },
  { name: 'হাফেজ আজম শেখ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01797908233' },
  { name: 'হাফেজ আঃ কাইয়ুম বিশ্বাস', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01819718156' },
  { name: 'হাফেজ রাছেল শেখ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01306698918' },
  { name: 'হাফেজ আহমাদুল্লাহ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01723120590' },
  { name: 'হাফেজ ইমরান আহমাদ', title: 'মুদাররিস', address: 'নিলফামারী', phone: '01796473720' },
  { name: 'হাফেজ হানজালা', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01910695926' },
  { name: 'হাফেজ আব্দুর রহমান', title: 'মুদাররিস', address: 'খুলনা', phone: '01986568730' },
  { name: 'হাফেজ মুশাররফ হুসাইন', title: 'মুদাররিস', address: 'খুলনা', phone: '01957118290' },
  { name: 'হাফেজ খালেদ সাইফুল্লাহ', title: 'মুদাররিস', address: 'নওগা', phone: '01770961094' },
  { name: 'হাফেজ রিয়াদ মোল্লা', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01722167841' },
  { name: 'হাফেজ মুহাম্মাদুল্লাহ সাগর মোল্লা', title: 'মুদাররিস', address: 'গোপালগঞ্জ, মাদারীপর', phone: '01304210845' },
  { name: 'হাফেজ সৈয়দ সাইফুল ইসলাম', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01601900312' },
  { name: 'হাফেজ সাইফুল ইসলাম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01775762106' },
  { name: 'হাফেজ ইস্রাফিল', title: 'মুদাররিস', address: 'শরীয়তপুর', phone: '01932848887' },
  { name: 'হাফেজ ইদ্রিস', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01843273751' },
  { name: 'হাফেজ আরাফাত হোসেন হোজাইফা', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01306799712' },
  { name: 'হাফেজ তানভীর ইসলাম', title: 'মুদাররিস', address: 'মুন্সীগঞ্জ', phone: '01628264716' },
  { name: 'হাফেজ জাহিদুল ইসলাম সাইফুল', title: 'মুদাররিস', address: 'ময়মনসিংহ', phone: '01881010149' },
  { name: 'হাফেজ আব্দুল মতিন', title: 'মুদাররিস', address: 'কুড়িগ্রাম', phone: '01798978898' },
  { name: 'হাফেজ জিহাদ হাসান', title: 'মুদাররিস', address: 'ঢাকা', phone: '01818208583' },
];

// ======================= বোর্ড বিভাগ (১৩ জন) =======================
const boardDept = [
  { name: 'ক্বারী আতিকুর রহমান', title: 'জিম্মাদার, বোর্ড বিভাগ', address: 'পিরোজপুর', phone: '01722423266' },
  { name: 'ক্বারী রাকিবুল ইসলাম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01782065794' },
  { name: 'ক্বারী ইব্রাহীম খলিলুল্লাহ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01773150231' },
  { name: 'ক্বারী আজিজুল হক শিবচর', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01727124291' },
  { name: 'ক্বারী জুনায়েদ আহমাদ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01771642988' },
  { name: 'ক্বারী বেলালুদ্দীন', title: 'মুদাররিস', address: 'নড়াইল', phone: '01714996680' },
  { name: 'ক্বারী ওলিউল্লাহ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01976250865' },
  { name: 'ক্বারী হেলাল উদ্দীন', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01913202482' },
  { name: 'ক্বারী শফিকুল ইসলাম', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01781072772' },
  { name: 'ক্বারী আবু হানীফ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01733949814' },
  { name: 'ক্বারী বশির আহমাদ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01703222332' },
  { name: 'ক্বারী মুফিজ শরীফ', title: 'মুদাররিস', address: 'নড়াইল', phone: '01962018135' },
  { name: 'ক্বারী মুফিজুল ইসলাম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01716521151' },
];

// ======================= নাজেরা বিভাগ (১৫ জন) =======================
const najeraDept = [
  { name: 'কারী ফয়জুল্লাহ', title: 'জিম্মাদার, নাযেরা বিভাগ', address: 'ফরিদপুর', phone: '01321184011' },
  { name: 'কারী আব্দুস সালাম', title: 'মুদাররিস', address: 'শরীয়তপুর', phone: '01752143176' },
  { name: 'কারী আজিজুল হক', title: 'মুদাররিস', address: 'মোমেনশাহী', phone: '01727124291' },
  { name: 'কারী শহিদুল ইসলাম', title: 'মুদাররিস', address: 'সিরাজগঞ্জ', phone: '01715283727' },
  { name: 'কারী শাহ আলম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01741687953' },
  { name: 'কারী মুহাম্মাদুল্লাহ', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01720282089' },
  { name: 'কারী আনোয়ার শেখ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01783302452' },
  { name: 'কারী শোয়াইব হুসাইন', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01710241031' },
  { name: 'কারী কিফায়াতুল্লাহ', title: 'মুদাররিস', address: 'কুমিল্লা', phone: '01732983252' },
  { name: 'কারী আব্দুল্লাহ হাওলাদার', title: 'মুদাররিস', address: 'বরিশাল', phone: '01873384097' },
  { name: 'কারী ইকবাল মীর', title: 'মুদাররিস', address: 'মোমেনশাহী', phone: '01982867463' },
  { name: 'কারী শামীম হোসেন', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01312278059' },
  { name: 'কারী আবু ইউসুফ', title: 'মুদাররিস', address: 'মোমেনশাহী', phone: '01916153939' },
  { name: 'কারী আব্দুর রাজ্জাক বাওয়ালী', title: 'মুদাররিস', address: 'বাগেরহাট', phone: '01913039325' },
  { name: 'কারী আব্দুল আজিম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01779989962' },
];

// ======================= মোলাঝিমিন (স্টাফ) =======================

// হিসাব বিভাগ (৪ জন)
const hisabDept = [
  { name: 'মাস্টার ইলিয়াছ হুসাইন', title: 'প্রধান হিসাব রক্ষক', address: 'শরীয়তপুর', phone: '01732580027' },
  { name: 'মাওলানা মাহবুবুর রহমান', title: 'সহ-হিসাব রক্ষক', address: 'পিরোজপুর', phone: '01732580026' },
  { name: 'মাওলানা ওয়ালীউল্লাহ', title: 'সহ-হিসাব রক্ষক', address: 'গোপালগঞ্জ', phone: '01732580028' },
  { name: 'মাওলানা আসলাম শেখ', title: 'সহ-হিসাব রক্ষক', address: 'গোপালগঞ্জ', phone: '01732580029' },
];

// দফতরে তা'লীমাত (৩ জন)
const daftarDept = [
  { name: 'মাস্টার জাহীদ মুর্শেদ', title: 'তা. কম্পিউটার অপারেটর', address: 'ফরিদপুর', phone: '01720581930' },
  { name: 'মাওলানা নোমান আহমাদ', title: 'সহ-তা. কম্পিউটার অপারেটর', address: 'ফরিদপুর', phone: '01749830687' },
  { name: 'মাওলানা মুশফিকুর রহমান', title: 'সহ- তালীমাত অফিস', address: 'ফরিদপুর', phone: '01300670723' },
];

// খাদেমুল মাসজিদ (২ জন)
const khademDept = [
  { name: 'মুহা: আব্দুল খালেক দেওয়ান', title: 'খাদেম', address: 'মাদারীপুর', phone: '01733519924' },
  { name: 'মুহা: রাকিব', title: 'খাদেম', address: 'মাদারীপুর', phone: '01975405944' },
];

// বোর্ডিং বিভাগ (৩০ জন)
const boardingDept = [
  { name: 'মুহা: নূরুল আলম শিকদার', title: 'বোর্ডিং ম্যানেজার', address: 'নড়াইল', phone: '01761719643' },
  { name: 'কারী আনোয়ার মোল্লা', title: 'বাজার জিম্মাদার', address: 'গোপালগঞ্জ', phone: '01760476673' },
  { name: 'মাওঃ আব্দুল মতিন', title: 'বোর্ডিং ম্যানেজার (বাজার)', address: 'মাদারীপুর', phone: '01726626444' },
  { name: 'মাওঃ মাসুদুর রহমান', title: 'সহ বোর্ডিং ম্যানেজার', address: 'গোপালগঞ্জ', phone: '01745206340' },
  { name: 'মুহা: আলমগীর মোল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01749027690' },
  { name: 'মুহা: আব্দুল মজিদ বেপারী', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01735790340' },
  { name: 'মুহা: হারুন মুন্সী', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01739840167' },
  { name: 'মুহা: হানিফ ফকির', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01714825995' },
  { name: 'মুহাঃ সলেমান মুনসী', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01737078727' },
  { name: 'মুহা: বাবলু ফকির', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01749133907' },
  { name: 'মুহা: সুমন মাতুব্বর', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01754113075' },
  { name: 'মুহা: সারেজান মোল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01746184474' },
  { name: 'মুহা: শহিদুল শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01745918307' },
  { name: 'মুহা: জিয়া উদ্দীন', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01725121545' },
  { name: 'মুহা: কানু বিশ্বাস', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01764691498' },
  { name: 'মুহা: আজমির ফকির', title: 'বাবুর্চি', address: 'গোপালগঞ্জ', phone: '01307182690' },
  { name: 'মুহা: সরোয়ার মোল্যা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01933602395' },
  { name: 'মুহা: জহিরুল ইসলাম মিথুন', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01726421690' },
  { name: 'মুহা: ইলিয়াছ শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01729600240' },
  { name: 'মুহা: রওশন মোল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01879469993' },
  { name: 'মুহা: আইয়ুব আলী শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01778781765' },
  { name: 'মুহা: জয়নাল মোল্লা', title: 'বাবুর্চি', address: 'শরীয়তপুর', phone: '01998065564' },
  { name: 'মুহা: আবু বক্কার', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '' },
  { name: 'মুহা: অয়েচ কুরুনী', title: 'বাবুর্চি', address: 'খুলনা', phone: '01740902321' },
  { name: 'মুহা: রাজু শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01755150977' },
  { name: 'মুহা: তোরাব আলী', title: 'বাবুর্চি', address: 'গোপালগঞ্জ', phone: '01706103269' },
  { name: 'মুহা: মিজানুর রহমান মুন্সি', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01734839876' },
  { name: 'মুহা: বাবুল বেপারী', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01735188691' },
  { name: 'মুহা: আব্দুল আলিম', title: 'বাবুর্চি', address: 'খুলনা', phone: '01967189866' },
  { name: 'মোহাম্মাদ আলী', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01969575961' },
  { name: 'মুহা: শাহাদাৎ ফরাজী', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01775085476' },
  { name: 'মুহাঃ শামীম মাতুব্বর', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01753686811' },
  { name: 'মুহাঃ বেলায়েত মুন্সী', title: 'বাবুর্চি', address: 'খুলনা', phone: '01896423887' },
];

// সিকিউরিটি (৭ জন)
const securityDept = [
  { name: 'মোহাঃ জহিরুল ইসলাম', title: 'সিকিউরিটি', address: 'গোপালগঞ্জ', phone: '01726421690' },
  { name: 'মুহা: আব্দুল কাদির মোড়ল', title: 'দারোয়ান', address: 'মাদারীপুর', phone: '01955777009' },
  { name: 'মুহা: রবিউল ইসলাম', title: 'দারোয়ান', address: 'খুলনা', phone: '01955653181' },
  { name: 'মুহা: আব্দুল করিম শেখ', title: 'দারোয়ান', address: 'খুলনা', phone: '01853101080' },
  { name: 'মুহ্য: কবির মিয়া', title: 'দারোয়ান', address: 'গোপালগঞ্জ', phone: '01722070673' },
  { name: 'মুহা: ইমাম আল হাফীজ', title: 'দারোয়ান', address: 'গোপালগঞ্জ', phone: '01730953750' },
  { name: 'মুহা: ফরহাদ শেখ', title: 'দারোয়ান', address: 'গোপালগঞ্জ', phone: '01967732460' },
];

// ক্লিনার ও অন্যান্য (৮ জন)
const cleanerDept = [
  { name: 'মুহা: মোস্তফা শেখ', title: 'ক্লিনার', address: 'খুলনা', phone: '01799341632' },
  { name: 'মুহা: ওবায়দুল্লাহ', title: 'ক্লিনার', address: 'খুলনা', phone: '01904918226' },
  { name: 'মুহা: ফারুক শেখ', title: 'ক্লিনার', address: 'খুলনা', phone: '01996898951' },
  { name: 'মুহা: মাহবুব আলম', title: 'খাদেমে দফতর', address: 'পটুয়াখালী', phone: '01726730284' },
  { name: 'মুহা: আব্দুল কুদ্দুস', title: 'ইলে: মিস্ত্রী', address: 'বরিশাল', phone: '01916758801' },
  { name: 'মুহা: নাঈম হোসেন', title: 'সহ ইলে: মিস্ত্রী', address: 'বরিশাল', phone: '01757160334' },
  { name: 'মুহা: শাহীন হোসেন', title: 'সহ ইলে: মিস্ত্রী', address: 'বরিশাল', phone: '01608569348' },
  { name: 'মুহা: ইয়ার আলী মুন্সী', title: 'খাদেমে দফতরে ইহতেমাম', address: 'গোপালগঞ্জ', phone: '01767097727' },
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
  { id: 8, title: 'খাদেমুল মাসজিদ', icon: 'home-outline', color: '#DC2626', colorBg: 'roseCardBg', colorBorder: 'roseCardBorder', data: khademDept },
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