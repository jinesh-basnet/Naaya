import NepaliDate from 'nepali-date-converter';

export const getNepaliDate = (): string => {
  const today = new Date();
  const nepaliDate = new NepaliDate(today);
  const year = nepaliDate.getYear();
  const month = nepaliDate.getMonth() + 1; 
  const day = nepaliDate.getDate();

  const monthNames = [
    'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
    'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
  ];

  return `${year} ${monthNames[month - 1]} ${day}`;
};
