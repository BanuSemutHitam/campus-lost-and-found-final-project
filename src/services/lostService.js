import LostItem from '../models/LostItem.js';

export const createLostItem = async (data) => {
  const newItem = new LostItem(data);
  return await newItem.save();
};

export const getAllLostItems = async (filter = {}) => {
  return await LostItem.find(filter).sort({ createdAt: -1 });
};

export const getLostItemById = async (id) => {
  return await LostItem.findById(id);
};

export const updateLostItem = async (id, data) => {
  return await LostItem.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  });
};

export const deleteLostItem = async (id) => {
  return await LostItem.findByIdAndDelete(id);
};
