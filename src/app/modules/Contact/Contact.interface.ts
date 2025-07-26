export interface IContact {
     phone: string;
     email: string;
     address: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IContactFilters = {
     searchTerm?: string;
};
