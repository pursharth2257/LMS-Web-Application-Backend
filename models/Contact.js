import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  query: { type: String, required: true },
  type: {
    type: String,
    enum: ['general', 'technical', 'financial'],
    required: true,
  },
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;