const LETTERS = "abcdefghijklmnopqrstuvwxyzáéíóúüñABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÜÑ -'";
const NUMBERS = '0123456789';

export function onlyLetters(text) {
    if (text.length === 0) {
        return false;
    }

    for (let index = 0; index < text.length; index += 1) {
        if (LETTERS.indexOf(text.charAt(index)) === -1) {
            return false;
        }
    }

    return true;
}

export function onlyNumbers(text) {
    if (text.length === 0) {
        return false;
    }

    for (let index = 0; index < text.length; index += 1) {
        if (NUMBERS.indexOf(text.charAt(index)) === -1) {
            return false;
        }
    }

    return true;
}

export function validPhone(text) {
    return text.length >= 7 && text.length <= 15 && onlyNumbers(text);
}

export function validDocument(text) {
    return text.length >= 6 && text.length <= 20 && onlyNumbers(text);
}

export function validEmail(text) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

export function twoDigits(number) {
    return number < 10 ? '0' + number : '' + number;
}
