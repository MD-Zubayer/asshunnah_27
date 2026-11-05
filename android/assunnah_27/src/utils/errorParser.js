/**
 * Utility to parse backend API error responses into clean human-readable Bengali text
 */
export const parseBackendError = (errorObj) => {
  if (!errorObj) return 'একটি অজানা সমস্যা ঘটেছে। আবার চেষ্টা করুন।';

  // If error is a string
  if (typeof errorObj === 'string') {
    // If backend returned an HTML error page (e.g. Django 500 debug page)
    if (errorObj.includes('<!DOCTYPE html>') || errorObj.includes('<html') || errorObj.includes('IntegrityError')) {
      if (errorObj.includes('phone_number') && errorObj.includes('already exists')) {
        return 'এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।';
      }
      if (errorObj.includes('email') && errorObj.includes('already exists')) {
        return 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।';
      }
      return 'এই তথ্য দিয়ে ইতোমধ্যে অ্যাকাউন্ট রয়েছে অথবা সার্ভারে সমস্যা হয়েছে। অনুগ্রহ করে ভিন্ন ইমেইল/মোবাইল দিয়ে চেষ্টা করুন।';
    }
    return errorObj;
  }

  // If error has a detail property
  if (errorObj.detail && typeof errorObj.detail === 'string') {
    return errorObj.detail;
  }

  // If error has a message property
  if (errorObj.message && typeof errorObj.message === 'string') {
    return errorObj.message;
  }

  // If error is an object with field error arrays
  if (typeof errorObj === 'object') {
    const messages = [];

    const fieldNames = {
      email: 'ইমেইল',
      phone_number: 'মোবাইল নম্বর',
      password: 'পাসওয়ার্ড',
      password_confirm: 'পাসওয়ার্ড নিশ্চিতকরণ',
      first_name: 'নাম',
      father_name: 'পিতার নাম',
      district: 'জেলা',
      upazila: 'উপজেলা',
      dakhila_number: 'দাখিলা নম্বর',
      blood_group: 'রক্তের গ্রুপ',
      period_of_education: 'শিক্ষার সময়কাল',
      non_field_errors: 'ত্রুটি',
    };

    for (const [key, val] of Object.entries(errorObj)) {
      const fieldLabel = fieldNames[key] || key;
      const rawMsg = Array.isArray(val) ? val.join(', ') : String(val);

      let cleanMsg = rawMsg;
      if (rawMsg.includes('user with this email address already exists') || rawMsg.includes('already exists')) {
        cleanMsg = 'ইতোমধ্যে ব্যবহৃত হয়েছে। নতুন তথ্য দিন।';
      } else if (rawMsg.includes('at least 8 characters')) {
        cleanMsg = 'কমপক্ষে ৮ অক্ষরের হতে হবে।';
      } else if (rawMsg.includes('valid email address')) {
        cleanMsg = 'সঠিক ইমেইল ফরম্যাট প্রদান করুন।';
      }

      if (key === 'non_field_errors' || key === 'detail') {
        messages.push(cleanMsg);
      } else {
        messages.push(`${fieldLabel}: ${cleanMsg}`);
      }
    }

    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  return 'অনুরোধটি প্রক্রিয়া করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
};
