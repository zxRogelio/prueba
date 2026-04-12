import { randomInt } from "crypto";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SPECIALS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SPECIALS;

function getRandomCharacter(charset) {
  return charset[randomInt(0, charset.length)];
}

function shuffleCharacters(characters) {
  const shuffled = [...characters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(0, index + 1);
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled.join("");
}

export const isStrongPassword = (password) => PASSWORD_REGEX.test(password);

export const generateRandomPassword = (length = 12) => {
  const safeLength = Math.max(length, 8);
  const characters = [
    getRandomCharacter(LOWERCASE),
    getRandomCharacter(UPPERCASE),
    getRandomCharacter(DIGITS),
    getRandomCharacter(SPECIALS),
  ];

  while (characters.length < safeLength) {
    characters.push(getRandomCharacter(ALL_CHARS));
  }

  const password = shuffleCharacters(characters);

  if (!isStrongPassword(password)) {
    return generateRandomPassword(safeLength);
  }

  return password;
};
