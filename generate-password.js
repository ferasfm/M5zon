import bcrypt from 'bcryptjs';

// توليد hash لكلمة المرور admin123
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
