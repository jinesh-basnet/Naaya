import React from 'react';
import { FaHeartbeat, FaGraduationCap, FaLeaf, FaTint, FaExclamationTriangle, FaUsers } from 'react-icons/fa';
import './CivicPage.css';

interface Announcement {
  id: number;
  title: string;
  description: string;
  image: string;
  action: string;
  link?: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
}

const announcements: Announcement[] = [
  {
    id: 1,
    title: 'Health Awareness Campaign',
    description: 'Stay healthy with regular check-ups and vaccinations. Learn about common health issues in Nepal and preventive measures.',
    image: 'https://via.placeholder.com/300x200?text=Health',
    action: 'Learn More',
    link: '#',
    icon: FaHeartbeat,
  },
  {
    id: 2,
    title: 'Education for All',
    description: 'Support education initiatives in rural Nepal. Help provide resources and opportunities for children to succeed.',
    image: 'https://via.placeholder.com/300x200?text=Education',
    action: 'Get Involved',
    link: '#',
    icon: FaGraduationCap,
  },
  {
    id: 3,
    title: 'Environmental Protection',
    description: 'Join efforts to protect Nepal\'s natural beauty. Participate in tree planting and waste management programs.',
    image: 'https://via.placeholder.com/300x200?text=Environment',
    action: 'Join Now',
    link: '#',
    icon: FaLeaf,
  },
  {
    id: 4,
    title: 'Blood Donation Drive',
    description: 'Save lives by donating blood. Regular blood donations are crucial for emergency medical care.',
    image: 'https://via.placeholder.com/300x200?text=Blood+Donation',
    action: 'Donate Blood',
    link: '#',
    icon: FaTint,
  },
  {
    id: 5,
    title: 'Disaster Preparedness',
    description: 'Be prepared for natural disasters. Learn emergency response and safety measures for earthquakes and floods.',
    image: 'https://via.placeholder.com/300x200?text=Disaster+Prep',
    action: 'Prepare Now',
    link: '#',
    icon: FaExclamationTriangle,
  },
  {
    id: 6,
    title: 'Community Support',
    description: 'Support your local community. Volunteer for local initiatives and help those in need.',
    image: 'https://via.placeholder.com/300x200?text=Community',
    action: 'Volunteer',
    link: '#',
    icon: FaUsers,
  },
];

const CivicPage: React.FC = () => {
  const handleAction = (link: string) => {
    window.open(link, '_blank');
  };

  return (
    <div className="civic-page">
      <h4 className="civic-title">Civic Hub</h4>
      <p className="civic-description">
        Public service announcements and community initiatives for Nepali communities.
      </p>
      <div className="announcements-container">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="announcement-card">
            <div
              className="card-media"
              style={{ backgroundImage: `url(${announcement.image})` }}
              role="img"
              aria-label={announcement.title}
            />
            <div className="card-content">
              <h5 className="card-title">
                <announcement.icon size={24} className="card-icon" />
                {announcement.title}
              </h5>
              <p className="card-description">{announcement.description}</p>
            </div>
            <div className="card-actions">
              <button
                className="action-button"
                onClick={() => handleAction(announcement.link || '#')}
              >
                {announcement.action}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CivicPage;
