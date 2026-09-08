import './pinkbox-home.css';
import PinkBoxHome from '../components/PinkBoxHome';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage(){
  return <PinkBoxHome />;
}
