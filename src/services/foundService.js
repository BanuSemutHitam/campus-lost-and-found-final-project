import FoundItem from '../models/FoundItem.js';

export const createFoundItem = async (data) => {
  const newItem = new FoundItem(data);
  return await newItem.save();
};

export const getAllFoundItems = async (filter = {}) => {
  return await FoundItem.find(filter).sort({ createdAt: -1 });
};

export const getFoundItemById = async (id) => {
  return await FoundItem.findById(id);
};

export const updateFoundItem = async (id, data) => {
  return await FoundItem.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  });
};

export const deleteFoundItem = async (id) => {
  return await FoundItem.findByIdAndDelete(id);
};
