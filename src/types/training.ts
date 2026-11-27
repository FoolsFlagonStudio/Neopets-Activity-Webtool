export const TRAINING_STORAGE_KEY = "nat_training";

export interface PetTraining {
  petName: string;
  stat: string | null;       // null = not enrolled
  finishesAt: number | null; // ms timestamp when training completes
  updatedAt: number;         // ms timestamp of last sync
  notifiedAt?: number;       // set once background has sent the completion notification
}

export interface TrainingStore {
  swashbuckling: PetTraining[];
  island_school: PetTraining[];
}
