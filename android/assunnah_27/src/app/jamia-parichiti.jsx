import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

const sections = [
  {
    id: 1,
    title: 'ভূমিকা',
    icon: 'book-outline',
    color: '#2563EB',
    colorBg: 'blueCardBg',
    colorBorder: 'blueCardBorder',
    content: `পৃথিবীর উষালগ্ন থেকে সত্য-অসত্য, হক্ব ও বাতিলের সংঘাত চলে আসছে। মহামহিম আল্লাহ তাআলার মনোনীত ধর্ম একমাত্র ইসলাম। জাগতিক চাহিদা, লোভ-লালসা এবং নশ্বর জগতের ক্ষণস্থায়ী সাজসজ্জা ও সৌন্দর্যের অবান্তর মোহে এক শ্রেণীর মানুষ সর্বযুগেই তাদের কূটকৌশল ও ষড়যন্ত্রের জাল বিস্তার করে কল্যাণ ও মুক্তির আদর্শবাহী ইসলামকে ধরাপৃষ্ঠ থেকে বিলুপ্ত করতে চেষ্টার কোনো ত্রুটি করেনি। এর পাশাপাশি নির্ভেজাল, চিরন্তন ও মহাসত্য ইসলামের নিশানবরদার আল্লাহর মদদপুষ্ট অন্য একটি দল পার্থিব সকল স্বার্থ জলাঞ্জলি দিয়ে জীবনের সর্বস্ব অকাতরে বিলীন করে আল্লাহর জমিনে আল্লাহ তা'আলার দ্বীন কায়েম করতে উৎসর্গিত ছিলেন। তাঁদেরই অদম্য স্পৃহা ও রক্ত নিংড়ানো শ্রমের অবদানে পৃথিবীর বুকে গড়ে উঠেছে ইসলাম ও ইসলামী ঐতিহ্যের নিরঙ্কুশ ধারাবাহিকতা সংরক্ষণের অগণিত দুর্জয় দূর্গ খাটি দ্বীনি প্রতিষ্ঠান। এই সূত্র পরম্পরায় ১৯৯০ ইং সালে তাবলীগ জামাতের বিশিষ্ট মুরব্বী নারায়ণগঞ্জ আমলাপাড়া মাদরাসার স্বনামধন্য মুহতামিম হযরত মাওলানা হুসাইন আহমাদ (রহ.) এর দিক-নির্দেশনায় মো: বাদশা মিয়া সাহেবের দানকৃত বিস্তৃত ভূমির উপরে বিশাল অবয়বে প্রতিষ্ঠা লাভ করে 'জামিয়াতুস সুন্নাহ'।`,
  },
  {
    id: 2,
    title: 'মাদরাসার নামকরণ',
    icon: 'text-outline',
    color: '#9333EA',
    colorBg: 'purpleCardBg',
    colorBorder: 'purpleCardBorder',
    content: `বিশ্ববিখ্যাত ইসলামী বিদ্যাপীঠ দারুল উলুম দেওবন্দের সিলসিলাভুক্ত একটি ঐতিহ্যবাহী দীনি শিক্ষাপ্রতিষ্ঠান 'জামিয়াতুস সুন্নাহ'। উপমহাদেশের প্রখ্যাত আলেম ও বুযুর্গ, মজলিসে দাওয়াতুল হক বাংলাদেশ-এর আমীরুল উমারা, ঢাকার ঐতিহ্যবাহী জামিয়া ইসলামিয়া দারুল উলুম মাদানিয়া যাত্রাবাড়ী-এর স্বনামধন্য মুহতামিম ও শায়খুল হাদীস, মুহিউস সুন্নাহ হযরত মাওলানা মাহমূদুল হাসান দামাত বারাকাতুহুমের দিক নির্দেশনায় অত্র প্রতিষ্ঠানের নামকরণ করা হয় 'জামিয়াতুস সুন্নাহ'। হযরতের পৃষ্ঠপোষকতা, দোয়া, পরামর্শ এবং আন্তরিকতায় জামিয়ার উন্নয়নের ধারা উত্তরোত্তর বেগবান হতে থাকে। আবাসিক অবস্থানের চিত্তাকর্ষক, হৃদয়গ্রাহী ও সুনিপুণ ব্যবস্থাপনার পাশাপাশি হযরতের তত্ত্বাবধানে সর্বোন্নত তালীম-তারবিয়তের সুনাম-সুখ্যাতি অল্প দিনে সারা দেশে ছড়িয়ে পড়ে।`,
  },
  {
    id: 3,
    title: 'জামিয়ার মুহতামিমগণ',
    icon: 'people-outline',
    color: '#059669',
    colorBg: 'emeraldCardBg',
    colorBorder: 'emeraldCardBorder',
    content: `জামিয়ার প্রথম মুহতামিম হযরত মাওলানা মুফতি আব্দুল আলীম (দা.বা.)। ২০০৩ সালে এটি কওমী মাদরাসার সর্বোচ্চ পাঠ্যস্তর দাওরায়ে হাদীসের পাঠদান ও জামিয়া তথা বিশ্ববিদ্যালয়ের মানে পূর্ণাঙ্গরূপে উন্নীত হয়। এ সময়ে মুহতামিম হিসেবে দায়িত্বভার গ্রহণ করেন উপমহাদেশের মুসলমানদের গর্বের তাজ, মুজাহিদে আজম আল্লামা শামসুল হক সদর সাহেব রহমাতুল্লাহি আলাইহি-এর সাহেবজাদা, হযরত মাওলানা মুফতি রুহুল আমীন দা. বা.। দাওরায়ে হাদীসের শুরুলগ্নে সর্বপ্রথম বুখারী শরীফের সবক উদ্বোধন করেন মুজাহিদে আজম আল্লামা শামসুল হক ফরিদপুরী রহমাতুল্লাহি আলাইহি-এর দোয়াধন্য যোগ্য শাগরেদ, উপমহাদেশের প্রখ্যাত হাদীসবিশারদ, বুখারী শরীফের বাংলা ব্যাখ্যাতা শায়খুল হাদীস আল্লামা আজিজুল হক রহ.। তিনি বুখারী শরীফের নির্দিষ্ট কিছু অংশ পড়ানোর জিম্মাদারী গ্রহণ করেন। ২০০৭ সালে মুহতামিম হিসেবে নিয়োগ পান হযরত মাওলানা মুফতি হোসাইন আহমদ (রহ.)। ২০১৩ সালের ২১ মে জামিয়ার মুহতামিম হিসেবে পরিচালনার হাল ধরেন স্বনামধন্য আলেমে দীন, হযরতুল আল্লাম মাওলানা নেয়ামাতুল্লাহ আল-ফরীদী দা. বা.। তাঁর সুদক্ষ ও বিজ্ঞ পরিচালনায় জামিয়ায় ব্যাপক সংস্কার ও উন্নতির ধারা অব্যাহত রয়েছে। ১৪৩১-৩২ হিজরীর বেফাক পরীক্ষায় জামিয়াতুস সুন্নাহ-এর ৫৬ জন ছাত্র সম্মিলিত মেধা তালিকায় স্থান লাভ করে এবং এর সুবাদে জামিয়া বেফাকভুক্ত মাদরাসাসমূহের মধ্যে ১ম হওয়ার গৌরব লাভ করে। গত ১৩ বছর যাবত (২০১১-২০২৪) জামিয়া বেফাকে তার শীর্ষস্থান ধরে রেখেছে। এবছর (২০২৪) ৫১৫ জন মেধা তালিকায় স্থান পেয়েছে। আলহামদুলিল্লাহ।`,
  },
  {
    id: 4,
    title: 'জামিয়ার অবস্থান',
    icon: 'location-outline',
    color: '#D97706',
    colorBg: 'amberCardBg',
    colorBorder: 'amberCardBorder',
    content: `রাজধানী ঢাকার অদূরে অবস্থিত ঢাকা-খুলনা মহাসড়কের অতি নিকটে পদ্মা নদীর দক্ষিণপ্রান্তে মাওয়া-শিবচর-মাদারীপুর সড়কে দক্ষিণকান্দি, বাহাদুরপুরে বর্তমানে ২০ একর জমির উপর সুবিশাল দেহে দাড়িয়ে আছে ঐতিহ্যবাহী জামিয়াতুস সুন্নাহ'। সুরম্য শিক্ষাভবন, সুবিশাল জামে মসজিদ, বিস্তৃত খেলার মাঠ, গভীর নলকূপের পর্যাপ্ত বিশুদ্ধ পানি, পাকা ঘাটবিশিষ্ট বিশাল পুকুর, জামিয়ার বাউন্ডারীভুক্ত মসৃণ রাস্তা, সবুজ গাছ-গাছালি শোভিত চিত্তাকর্ষক, নয়নাভিরাম, মনোমুগ্ধকর ও পরিমার্জিত আবাসিক অবস্থানে চার হাজারের অধিক শিক্ষার্থী যোগ্য উস্তাদগণের সার্বক্ষণিক তত্ত্বাবধানে ২৪ ঘণ্টার নিযামুল আওকাত (রুটিন) সামনে রেখে শিক্ষা গ্রহণে নিয়োজিত রয়েছে।`,
  },
  {
    id: 5,
    title: 'জামিয়ার লক্ষ্য ও উদ্দেশ্য',
    icon: 'flag-outline',
    color: '#EC4899',
    colorBg: 'redCardBg',
    colorBorder: 'redCardBorder',
    content: `দ্বীন ইসলামের জ্ঞানসম্ভার, ঐতিহ্য, গুরুত্ব ও মূল্যবােধ পুনরুজ্জীবিত করে মুসলিম সমাজে আল্লাহ তা'আলার একত্ববাদ ও রিসালাতসহ যাবতীয় ইসলামী আক্বীদা ও ঈমানী চিন্তা-চেতনার সঠিক বাস্তবায়ন এবং ইসলামের অনিন্দ্যসুন্দর, চিরশাশ্বত খোদামুখি আদর্শভিত্তিক জীবন গঠনের প্রেরণা সৃষ্টি করা। পাশাপাশি ইসলামী জ্ঞানগরিমাসমৃদ্ধ বেশভূষা ও ভাবধারায় দ্বীনের খিদমতে নিবেদিতপ্রাণ একটি শক্তিশালী দাওয়াতী কাফেলা গঠনপূর্বক মহানবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম এর সুন্নাত ও আদর্শ বাস্তবায়ন ও অনুসরণ করতঃ আল্লাহ তাআলার হুকুম পালন ও তার সন্তুষ্টি অর্জনের মাধ্যমে ইহলৌকিক ও পরলৌকিক শান্তি ও মুক্তি লাভের প্রয়াস চালানো।`,
  },
  {
    id: 6,
    title: 'জামিয়ার প্রকল্পসমূহ',
    icon: 'layers-outline',
    color: '#2563EB',
    colorBg: 'blueCardBg',
    colorBorder: 'blueCardBorder',
    content: '১. শিক্ষাপ্রকল্প ২. প্রশিক্ষণ প্রকল্প ৩. খেদমতে খালক বা জনসেবা প্রকল্প',
    subsections: [
      {
        subTitle: '১। শিক্ষাপ্রকল্প',
        subContent: `এ প্রকল্পে আপাতত ৭টি বিভাগ রয়েছে।

(১) মক্তব বিভাগ: এ বিভাগে শিশুদেরকে নূরানী পদ্ধতিতে মাত্র ২ বছরে প্রাথমিক বাংলা, ইংরেজী, অংকসহ জরুরী মাসআলা, দোয়া, কালিমা, উযু, নামায ইত্যাদির বাস্তব প্রশিক্ষণসহ পবিত্র কুরআন কারীম সহীহ-শুদ্ধরূপে পড়ার যোগ্য করে গড়ে তোলা হয় এবং ৪০টি হাদীস মুখস্থ করানো হয়।

(২) হিফয বিভাগ: এ বিভাগে মক্তব সমাপনকারী মেধাবী ছাত্রদেরকে ৩ বছরে পূর্ণ কুরআন কারীম সহীহ-শুদ্ধরূপে মুখস্থ করানো হয়। পাশাপাশি আরবী লাহনে, হদর অনুসরণে তিলাওয়াতের বিশেষ প্রশিক্ষণ দেওয়া হয়।

(৩) কিতাব বিভাগ: এ বিভাগ জামিয়ার পূর্ণাঙ্গ ইসলামী শিক্ষা ব্যবস্থাপনাসমৃদ্ধ প্রধান বিভাগ। এ বিভাগে মক্তব এবং হিফয সমাপনকারী ছাত্রদেরকে শ্রেণীভিত্তিক ১০ বছরে কুরআন, হাদীস, ফিকহ, তাফসীর , আক্বাইদ, আদব, নাহ, ছরফ, বালাগাত, মানতিক, হিকমত, ফালসাফাসহ যাবতীয় ধর্মীয় জ্ঞানে পারদর্শী করে সুদক্ষ ও বিজ্ঞ আলিমরূপে গড়ে তোলা হয়। প্রাতিষ্ঠানিক শিক্ষা শেষে বিভিন্ন স্তরে দ্বীনি খিদমত আঞ্জাম দানের জন্য তাদেরকে সনদ প্রদান করা হয়। কিতাব বিভাগের দাওরায়ে হাদীস সমাপনকারী আলিমগণ 'মাওলানা' উপাধি লাভ করেন।

(৪) ইফতা বিভাগ: ১৪৩৫-৩৬ হি./২০১৪-১৫ইং শিক্ষাবর্ষ হতে দারুল ইফতা ও ফতওয়া বিভাগ খোলা হয়েছে। এর সুবাদে জামিয়া উন্নতির লক্ষ্যে আরো একধাপ অগ্রসর হয়েছে এবং ইলমচর্চা ও গবেষণার ক্ষেত্রে নতুন মাত্রা যুক্ত হয়েছে।

(৫) উলূমুল হাদিস বিভাগ: ১৪৪৫-৪৬ হি./২০২৪-২৫ ইং চলতি শিক্ষাবর্ষে চালু হয়েছে। এর মাধ্যমে ছাত্ররা হাদিস গবেষণায় অগ্রগতি লাভ করতে পারবে।

(৬) আরবি সাহিত্য বিভাগ: ১৪৩৬-৩৭ হি./২০১৫-১৬ ইং শিক্ষাবর্ষ থেকে আদব বিভাগ খোলা হয়েছে। এটা একবছর মেয়াদী কোর্স। এর সুবাদে জামিয়া উন্নতির লক্ষ্যে আরো একধাপ এগিয়ে গেছে এবং ইলমচর্চার ক্ষেত্রে নতুন গতির সঞ্চার করেছে।

(৭) উচ্চতর কিরাত বিভাগ: ১৪৪৫-৪৬ হি./২০২৪-২৫ ইং শিক্ষাবর্ষ হতে খোলা হয়েছে।`,
      },
      {
        subTitle: '২। প্রশিক্ষণ প্রকল্প',
        subContent: `পর্যায়ক্রমিক শিক্ষাব্যবস্থা ছাড়াও যুগ-চাহিদার দাবীতে ছাত্রদেরকে সময়োপযোগী আদর্শ দীনি সেবকরূপে গড়ে তোলার জন্য জামিয়া কর্তৃপক্ষ নিম্নবর্ণিত পদক্ষেপ গ্রহণ করেছেন। এ পর্যায়ে ৫টি পদক্ষেপ প্রণিধানযোগ্য-

(ক) ছাত্রপাঠাগার: জামিয়ার সিলেবাসের অন্তর্ভুক্ত পর্যায়ক্রমিক শিক্ষাব্যবস্থার পাশাপাশি ছাত্রদের বিভিন্নমুখী জ্ঞানার্জন এবং দেশ ও জাতির সমকালীন ও আন্তর্জাতিক পরিস্থিতি সম্পর্কে সম্যক অবগতি লাভের নিমিত্তে বিবিধ বিষয় সম্বলিত তথ্যবহুল পুস্তকাদি, সাপ্তাহিক ও মাসিক পত্র-পত্রিকাসহ ১টি মানসম্মত পাঠাগারের ব্যবস্থা রয়েছে।

(খ) বক্তৃতা প্রতিযোগিতা: কুরআন হাদীসের গভীর জ্ঞানার্জনের পাশাপাশি তা সর্বসাধারণের মাঝে ব্যাপক ও আকর্ষণীয় করে পেশ করার যোগ্যতা সৃষ্টির লক্ষ্যে বিষয়ভিত্তিক জ্ঞানার্জন এবং বাকশক্তি প্রখরের নিমিত্তে সাপ্তাহিক প্রশিক্ষণমূলক বক্তৃতা প্রতিযোগিতা অনুষ্ঠানের আয়োজন করা হয়।

(গ) দেয়ালিকা: ধারাবাহিক পড়াশুনার সাথে সাথে আরবী ও বাংলা ভাষার উপর বিশেষ যোগ্যতার্জনের জন্য 'হেরার কাফেলা' নামে বাংলায় একটি দেয়ালিকা এবং 'আল-হিলাল' নামে আরবীতে একটি দেয়ালিকা ছাত্রদের উদ্যোগে নিয়মিত প্রকাশ করা হয়।

(ঘ) বিষয়ভিত্তিক মুহাযারা ও বিতর্ক অনুষ্ঠান: সমকালীন ভ্রান্তবাদীদের আকীদা-বিশ্বাস সম্পর্কে অবগত এবং তার হেকমতপূর্ণ জবাব দানের প্রশিক্ষণস্বরূপ বিষয়ভিত্তিক বিতর্ক অনুষ্ঠান ও মুহাযারার ব্যবস্থা করা হয়।

(ঙ) আমলের বাস্তব প্রশিক্ষণ: তালীম ও তারবিয়তের পাশাপাশি ছাত্ররা যেন উযু-গোসল, আযান, ইকামাত, নামায, কাফন-দাফনসহ সকল প্রকার আমল নিজেদের জীবনে সহীহভাবে বাস্তবায়ন করতে পারে এজন্য আমলের বাস্তব প্রশিক্ষণের ব্যবস্থা রয়েছে।`,
      },
      {
        subTitle: '৩। জামিয়ার জনসেবা প্রকল্প',
        subContent: `এ প্রকল্পে ৮ টি পদক্ষেপ রয়েছে।

(ক) সাবাহী মক্তব: জামিয়ার নিয়মিত শিক্ষাকার্যক্রমের পাশাপাশি সাবাহী মক্তবে সুযোগ্য শিক্ষকের মাধ্যমে এলাকার বিভিন্ন স্কুলের ছাত্র/ছাত্রীদের কুরআন শিক্ষা দেয়া হয়।

(খ) ফাতওয়া বিভাগ: এ বিভাগে ব্যক্তিগত, সামাজিক, পারিবারিক ইত্যাদি সমস্যা শরীয়তের নিরিখে বিচার-বিশ্লেষণ করে তার শরীয়তসম্মত সমাধান দেওয়া হয়।

(গ) ফারায়েজ বিভাগ: এ বিভাগে মৃত ব্যক্তির রেখে যাওয়া স্থাবর অস্থাবর যাবতীয় সম্পদ শরীয়ত নির্দেশিত পন্থায় ওয়ারিশগণের মধ্যে সহীহ ও সুন্দরভাবে বণ্টনের রূপরেখা বর্ণনা করা হয়।

(ঘ) রচনা ও প্রকাশনা বিভাগ: জামিয়ার রচনা ও প্রকাশনা বিভাগ বাতিলপন্থী সাহিত্যিকদের মোকাবিলায় ইসলামী সাহিত্য চর্চায় দুর্বার গতিতে এগিয়ে যাওয়ার আশা রাখে।

(ঙ) মজলিসে দাওয়াতুল হক: হাকীমুল উম্মত হযরত মাওলানা আশরাফ আলী থানবী রহমাতুল্লাহি আলাইহি-এর সিলসিলায় মাওলানা শাহ আবরারুল হক রহমাতুল্লাহি আলাইহি এর নির্দেশিত ও আল্লামা মাহমুদুল হাসান দা.বা. কর্তৃক পরিচালিত মজলিসে দাওয়াতুল হকের কর্মসূচী সুচারুরূপে সম্পাদন করা হয়।

(চ) দাওয়াত ও তাবলীগ : দ্বীনি ইলম শিক্ষার পাশাপাশি সাধারণ জনতাকে ইসলামী ভাবধারায় গড়ে তুলতে এবং আমলী ও দাওয়াতী কার্যক্রম বাস্তবায়ন করার লক্ষ্যে ছাত্রদেরকে তাবলীগ জামাতে সম্পৃক্ত করে বিভিন্ন মেয়াদী সময় লাগিয়ে তাবলীগী কার্যক্রম আঞ্জাম দেওয়া হয়।

(ছ) বয়স্কদের কুরআন শিক্ষা: প্রতি বছর ১লা রমযান থেকে রমযানের শেষ পর্যন্ত এই বয়স্ক শিক্ষা চালু থাকে। রমযানের শেষ দশ দিনে জামিয়ার জামে মসজিদে ইতিকাফ করার সুব্যবস্থা থাকে।

(জ) নাহু সরফ ও আরবী সাহিত্য প্রশিক্ষণ: প্রতিবছর ১লা রমযান থেকে ২৫ শে রমযান পর্যন্ত নাহু সরফ ও আরবী সাহিত্যের বিশেষ কোর্স অনুষ্ঠিত হয়।

(ঝ) নূরানী মুয়াল্লিম প্রশিক্ষণ: জামিয়া এই নূরানী পদ্ধতিতে শিক্ষাকার্য প্রচার ও প্রসারের নিমিত্তে আদর্শ ও যোগ্য শিক্ষক গঠনের বিশেষ উদ্যোগের অংশ হিসেবে নূরানী মুআল্লিম প্রশিক্ষণ কোর্স চালু করেছে।`,
      },
    ],
  },
  {
    id: 7,
    title: 'জামিয়ার ভবিষ্যৎ কর্মসূচী',
    icon: 'trending-up-outline',
    color: '#9333EA',
    colorBg: 'purpleCardBg',
    colorBorder: 'purpleCardBorder',
    content: `ভবিষ্যতে জামিয়ার যেসকল কর্মসূচী রয়েছে তা নিম্নরূপ :

(১) উচ্চতর তাফসীর বিভাগ: এটা দাওরায়ে হাদীসের চূড়ান্ত পরীক্ষায় উত্তীর্ণ ছাত্রদের জন্য কুরআন কারীমের তাফসীর বিষয়ক বিস্তারিত ব্যাখ্যাসম্বলিত জ্ঞানলাভের গবেষণামূলক বিশেষ বিভাগ।

(২) দাওয়াহ বিভাগ: এটা দাওরায়ে হাদীস ফারেগ ছাত্রদের জন্য দাওয়াহ বিষয়ক গবেষণা বিভাগ।

(৩) উন্মুক্ত পাঠাগার: মানবজাতির উন্নতির শিখরে আরোহনের জন্য সর্বপ্রথম আবশ্যকীয় বস্তু হলো জ্ঞান। আলহামদু লিল্লাহ, আমাদের এ জামিয়া জাতির উন্নতি-অগ্রগতি এবং সমাজ থেকে অজ্ঞতা-মূর্খতা দূরীকরণ ও ছাত্রদের বহুমুখী যোগ্যতা অর্জনের লক্ষ্যে এক উন্মুক্ত পাঠাগারের ব্যবস্থা করতে যাচ্ছে। যা জামিয়ার অগ্রগতির জন্য নতুন মাইল-ফলক।

(৪) ক্যাডেট স্কুল: এতে শিশু-কিশোরদেরকে সাধারণ শিক্ষা ও ইসলামি শিক্ষার সমন্বয়ে যুগোপযোগী শিক্ষাদানের সুব্যবস্থা থাকবে।

আল্লাহ আমাদেরকে তার দ্বীনের খেদমত ও প্রচার-প্রসারের জন্য কবুল করে নিন। আমীন !`,
  },
];

export default function JamiaParichitiScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const getColorBg = (key) => colors[key] || colors.blueCardBg;
  const getColorBorder = (key) => colors[key.replace('Bg', 'Border')] || colors.blueCardBorder;

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
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>জামিয়া পরিচিতি</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>জামিয়াতুস সুন্নাহ</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
              <Ionicons name="school" size={36} color={colors.accentBlue} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>জামিয়াতুস সুন্নাহ</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>একটি ঐতিহ্যবাহী দীনি শিক্ষাপ্রতিষ্ঠান</Text>
          </View>
        </View>

        {/* Sections */}
        {sections.map((section) => (
          <View key={section.id} style={styles.sectionWrapper}>
            <View
              style={[
                styles.sectionOuterCard,
                {
                  backgroundColor: getColorBg(section.colorBg),
                  borderColor: getColorBorder(section.colorBorder),
                },
              ]}
            >
              <View
                style={[
                  styles.sectionInnerCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                {/* Section Header */}
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionIconBadge,
                      { backgroundColor: `${section.color}15`, borderColor: `${section.color}30` },
                    ]}
                  >
                    <Ionicons name={section.icon} size={22} color={section.color} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                </View>

                {/* Section Content */}
                <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
                  {section.content}
                </Text>

                {/* Subsections (if any) */}
                {section.subsections?.map((sub, index) => (
                  <View key={index} style={styles.subsectionWrapper}>
                    <View style={[styles.subsectionDivider, { backgroundColor: colors.inputBorder }]} />
                    <Text style={[styles.subsectionTitle, { color: colors.text }]}>{sub.subTitle}</Text>
                    <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
                      {sub.subContent}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={[styles.footerCard, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
          <View style={[styles.footerInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="heart" size={20} color={colors.accentEmerald} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              আল্লাহ আমাদেরকে তার দ্বীনের খেদমত ও প্রচার-প্রসারের জন্য কবুল করে নিন। আমীন !
            </Text>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 60 }} />
      </ScrollView>
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
  scrollView: {
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
  sectionWrapper: {
    marginBottom: 14,
  },
  sectionOuterCard: {
    borderRadius: 20,
    padding: 2.5,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionInnerCard: {
    borderRadius: 17,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    fontStyle: 'italic',
  },
  sectionContent: {
    fontSize: 13,
    lineHeight: 24,
    fontWeight: '500',
  },
  subsectionWrapper: {
    marginTop: 8,
  },
  subsectionDivider: {
    height: 1,
    marginVertical: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    fontStyle: 'italic',
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
});