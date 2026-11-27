import {getStore} from '@netlify/blobs';
import {createCompanionHandler} from '../../lib/companion-book-route.mjs';
export default async request=>createCompanionHandler(getStore({name:'hen-bea-companion-books',consistency:'strong'}))(request);
export const config={path:['/activity-books/:id','/activity-books/:id/*']};
