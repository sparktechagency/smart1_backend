import mongoose from 'mongoose';
import { VariantField } from '../app/modules/variantField/variantField.model';
import { defaultVariantFields } from '../app/modules/variantField/variantField.constants';
import config from '../config';

// Function to seed variant fields
const seedVariantFields = async () => {
  try {
    // Check if variant fields already exist
    const existingVariantField = await VariantField.findOne({});
    
    if (existingVariantField) {
      console.log('Variant fields already exist. Skipping seeding.');
      return;
    }
    
    // Create default variant fields
    await VariantField.create(defaultVariantFields);
    
    console.log('Variant fields seeded successfully!');
  } catch (err) {
    console.error('Error seeding variant fields:', err);
  }
};

// Main seeding function
const runSeed = async () => {
  try {
    console.log('--------------> Variant fields seeding start <--------------');
    await seedVariantFields();
    console.log('--------------> Variant fields seeding completed <--------------');
  } catch (error) {
    console.error('Error during variant fields seeding:', error);
  } finally {
    mongoose.disconnect();
  }
};

// Connect to MongoDB and run the seeding
if (require.main === module) {
  mongoose
    .connect(config.database_url as string)
    .then(() => runSeed())
    .catch((err) => console.error('Error connecting to MongoDB:', err));
}

export default seedVariantFields;
