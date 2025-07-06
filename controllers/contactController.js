import Contact from '../models/Contact.js';

export const createContact = async (req, res) => {
  try {
    const { name, email, subject, query, type } = req.body;
    const contact = new Contact({ name, email, subject, query, type });
    await contact.save();
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ message: 'Error creating contact query', error: err.message });
  }
};

export const getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving contact queries', error: err.message });
  }
};

export const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Query not found' });
    res.status(200).json(contact);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving query', error: err.message });
  }
};

export const deleteContact = async (req, res) => {
  try {
    const deleted = await Contact.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Query not found' });
    res.status(200).json({ message: 'Query deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting query', error: err.message });
  }
};