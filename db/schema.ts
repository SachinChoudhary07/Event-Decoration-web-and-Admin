import {sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const categories=sqliteTable('categories',{id:text('id').primaryKey(),slug:text('slug').notNull().unique(),data:text('data').notNull()});
export const decorations=sqliteTable('decorations',{id:text('id').primaryKey(),slug:text('slug').notNull().unique(),categoryId:text('category_id').notNull().references(()=>categories.id),data:text('data').notNull()},t=>[index('decorations_category').on(t.categoryId)]);
export const testimonials=sqliteTable('testimonials',{id:text('id').primaryKey(),data:text('data').notNull()});
export const settings=sqliteTable('settings',{id:text('id').primaryKey(),data:text('data').notNull()});
export const uploads=sqliteTable('uploads',{id:text('id').primaryKey(),key:text('key').notNull().unique(),type:text('type').notNull(),createdAt:text('created_at').notNull()});
