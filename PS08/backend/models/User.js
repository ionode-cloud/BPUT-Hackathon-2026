const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = [
  'Super Admin',
  'Group ESG Admin',
  'Subsidiary Admin',
  'Business Unit Manager',
  'Project/Department User',
  'ESG Manager',
  'Compliance Officer',
  'Management',
  'Auditor/Reviewer',
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'Project/Department User',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    profilePicture: {
      type: String,
    },
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password - supports bcrypt hashes and direct unhashed database edits with auto-upgrade
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;

  const isBcrypt =
    typeof this.password === 'string' &&
    (this.password.startsWith('$2a$') ||
      this.password.startsWith('$2b$') ||
      this.password.startsWith('$2y$'));

  if (isBcrypt) {
    try {
      const isMatch = await bcrypt.compare(enteredPassword, this.password);
      if (isMatch) return true;
    } catch (err) {
      // Fall through to plain text check
    }
  }

  // Fallback: If password was edited directly in MongoDB Atlas / Compass / scripts without bcrypt
  if (this.password === enteredPassword) {
    this.password = enteredPassword;
    await this.save();
    return true;
  }

  return false;
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
module.exports.ROLES = ROLES;
