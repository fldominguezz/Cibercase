import React, { createContext, useContext, useState } from 'react';
import TicketModal from '../components/TicketModal';
import InfoModal from '../components/InfoModal';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketModalId, setTicketModalId] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalContent, setInfoModalContent] = useState('');

  const openTicketModal = (id) => {
    setTicketModalId(id);
    setShowTicketModal(true);
  };

  const closeTicketModal = () => {
    setShowTicketModal(false);
    setTicketModalId(null);
  };

  const openInfoModal = (title, content) => {
    setInfoModalTitle(title);
    setInfoModalContent(content);
    setShowInfoModal(true);
  };

  const closeInfoModal = () => {
    setShowInfoModal(false);
    setInfoModalTitle('');
    setInfoModalContent('');
  };

  const modalContextValue = {
    openTicketModal,
    closeTicketModal,
    openInfoModal,
    closeInfoModal,
  };

  return (
    <ModalContext.Provider value={modalContextValue}>
      {children}
      {showTicketModal && (
        <TicketModal ticketId={ticketModalId} onClose={closeTicketModal} />
      )}
      {showInfoModal && (
        <InfoModal title={infoModalTitle} content={infoModalContent} onClose={closeInfoModal} />
      )}
    </ModalContext.Provider>
  );
};