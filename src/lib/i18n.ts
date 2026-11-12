import type { Lang } from "./types";

// Marathi strings are a first draft: please have a native reader check them
// before the page goes to guests.
const strings = {
  en: {
    switchLang: "मराठी",
    invitedBy: "You are invited",
    viewCard: "View the invitation card",
    cardEn: "Invitation card (English)",
    cardMr: "Invitation card (Marathi)",
    isThisYou: "Is this invitation for you?",
    yesThatsUs: "Yes, that's us",
    notUs: "No, this isn't us",
    notUsHelp: "Sorry about that. Please call the family so we can send you the right link.",
    notUsAsk: "Sorry about that. Enter your mobile number and the family will send you your own link.",
    mobileLabel: "Your mobile number",
    send: "Send",
    back: "Back",
    notUsThanks: "Thank you. The family will check and send you your own link on WhatsApp.",
    badMobile: "Please enter a 10-digit mobile number.",
    intro: "Help us host you well. Tell us who's coming.",
    coming: "Coming",
    notComing: "Can't come",
    howMany: "How many people?",
    howManyVeg: "How many vegetarian?",
    nonVeg: "Non-vegetarian",
    arrival: "When will you arrive?",
    early: "Early",
    on_time: "On time",
    late: "A little late",
    submit: "Send our reply",
    saving: "Sending…",
    thanksYes: "Thank you! We look forward to seeing you.",
    thanksNo: "Thank you for letting us know. You'll be missed.",
    yourReply: "Your reply",
    people: "people",
    person: "person",
    veg: "veg",
    nonVegShort: "non-veg",
    allVeg: "all veg",
    allNonVeg: "all non-veg",
    vegOnlyNote: "Vegetarian food only.",
    change: "Change our reply",
    changeUntil: "You can change this until",
    closed: "Replies are now closed. Please call the family for any change.",
    closedCall: "Replies are now closed. For any change, please call the family on",
    answerAll: "Please answer for every function.",
    error: "Something went wrong. Please try again.",
    notFound: "This link isn't valid. Please check the invitation or call the family.",
    map: "Map",
    quickNoSignup: "It takes a minute · No sign-up needed",
    changeBy: "You can change this until {date}",
  },
  mr: {
    switchLang: "English",
    invitedBy: "आपणांस सस्नेह निमंत्रण",
    viewCard: "निमंत्रण पत्रिका पहा",
    cardEn: "निमंत्रण पत्रिका (इंग्रजी)",
    cardMr: "निमंत्रण पत्रिका (मराठी)",
    isThisYou: "हे निमंत्रण आपल्यासाठी आहे का?",
    yesThatsUs: "हो, आम्हीच",
    notUs: "नाही, हे आमचे नाही",
    notUsHelp: "क्षमस्व. कृपया कुटुंबाशी संपर्क साधा, आम्ही योग्य लिंक पाठवू.",
    notUsAsk: "क्षमस्व. आपला मोबाईल नंबर लिहा, कुटुंबीय आपली स्वतःची लिंक पाठवतील.",
    mobileLabel: "आपला मोबाईल नंबर",
    send: "पाठवा",
    back: "मागे",
    notUsThanks: "धन्यवाद. कुटुंबीय तपासून आपली लिंक WhatsApp वर पाठवतील.",
    badMobile: "कृपया १० अंकी मोबाईल नंबर लिहा.",
    intro: "आपल्या स्वागताची योग्य तयारी करता यावी म्हणून कृपया आपली उपस्थिती कळवा.",
    coming: "येणार",
    notComing: "येऊ शकणार नाही",
    howMany: "किती जण येणार?",
    howManyVeg: "त्यापैकी शाकाहारी किती?",
    nonVeg: "मांसाहारी",
    arrival: "आपण केव्हा पोहोचाल?",
    early: "लवकर",
    on_time: "वेळेवर",
    late: "थोडे उशिरा",
    submit: "उत्तर पाठवा",
    saving: "पाठवत आहे…",
    thanksYes: "धन्यवाद! आपल्या भेटीची आम्ही वाट पाहत आहोत.",
    thanksNo: "कळवल्याबद्दल धन्यवाद. आपली उणीव भासेल.",
    yourReply: "आपले उत्तर",
    people: "जण",
    person: "जण",
    veg: "शाकाहारी",
    nonVegShort: "मांसाहारी",
    allVeg: "सर्व शाकाहारी",
    allNonVeg: "सर्व मांसाहारी",
    vegOnlyNote: "फक्त शाकाहारी जेवण.",
    change: "उत्तर बदला",
    changeUntil: "आपण हे उत्तर या तारखेपर्यंत बदलू शकता:",
    closed: "उत्तरे स्वीकारणे आता बंद झाले आहे. बदलासाठी कृपया कुटुंबाशी संपर्क साधा.",
    closedCall: "उत्तरे स्वीकारणे आता बंद झाले आहे. बदलासाठी कृपया या क्रमांकावर कुटुंबाला फोन करा:",
    answerAll: "कृपया प्रत्येक कार्यक्रमासाठी उत्तर द्या.",
    error: "काहीतरी चुकले. कृपया पुन्हा प्रयत्न करा.",
    notFound: "ही लिंक वैध नाही. कृपया निमंत्रण तपासा किंवा कुटुंबाशी संपर्क साधा.",
    map: "नकाशा",
    quickNoSignup: "उत्तर द्यायला एक मिनिट लागेल · नोंदणीची गरज नाही",
    changeBy: "{date}पर्यंत आपण उत्तर बदलू शकता",
  },
} as const;

export type StringKey = keyof (typeof strings)["en"];

export function t(lang: Lang, key: StringKey): string {
  return strings[lang][key];
}

/**
 * Marathi dates use the same digits as everything else on the page (phone
 * numbers, codes, headcounts): 0-9, not Devanagari numerals. Owner, 11 Nov.
 */
export const MR_LOCALE = "mr-IN-u-nu-latn";
const locale = (lang: Lang) => (lang === "mr" ? MR_LOCALE : "en-IN");
/** Times as "10:00 am" in both languages. */
const lowerAmPm = (s: string) => s.replace(/\bAM\b/g, "am").replace(/\bPM\b/g, "pm");

export function formatWhen(iso: string, lang: Lang): string {
  return lowerAmPm(new Intl.DateTimeFormat(locale(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit", // hh:mm am/pm everywhere
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso)));
}

export function formatDay(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}
