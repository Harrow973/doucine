// src/admin/services/eventService.js
import axios from 'axios';
import authService from './authService';

// Configuration de l'URL de l'API selon l'environnement
let API_URL;

// Déterminer l'environnement d'exécution et configurer l'URL de l'API en conséquence
if (import.meta.env.DEV) {
  // En développement local, utiliser le proxy Vite configuré dans vite.config.js
  // Cela évite les problèmes CORS car les requêtes passent par le même origine
  API_URL = '/api/v2';
  console.log('Mode développement (avec proxy Vite): API_URL =', API_URL);
} 
// En production avec Netlify, utiliser directement l'URL complète de l'API
else if (import.meta.env.PROD && window.location.hostname !== 'localhost') {
  // Utiliser l'URL complète de l'API pour éviter les problèmes de redirection
  API_URL = 'https://api.association-doucine.fr/api/v2';
  console.log('Mode production (Netlify): API_URL =', API_URL);
} 
// En production locale (npm run preview), utiliser l'URL complète depuis .env.production
else {
  API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v2';
  console.log('Mode production (local): API_URL =', API_URL);
}

const eventService = {
  /**
   * Récupère tous les événements
   * @returns {Promise<Array>} Liste des événements
   */
  // Fonction pour normaliser les données d'événements et garantir un format cohérent
  _normalizeEventData(events) {
    if (!Array.isArray(events)) {
      console.error('Les données reçues ne sont pas un tableau:', events);
      return [];
    }
    
    return events.map(event => {
      // Créer une copie de l'événement pour éviter de modifier l'original
      const normalizedEvent = { ...event };
      
      // Normaliser la date si elle existe
      if (normalizedEvent.date) {
        // Si la date est une chaîne JSON, essayer de la parser
        if (typeof normalizedEvent.date === 'string' && normalizedEvent.date.startsWith('{')) {
          try {
            normalizedEvent.date = JSON.parse(normalizedEvent.date);
            console.log('Date convertie de JSON string à objet:', normalizedEvent.date);
          } catch (e) {
            console.error('Erreur lors du parsing de la date JSON:', e);
          }
        }
        
        // Si la date est un objet mais sans les propriétés attendues, essayer de la récupérer
        if (typeof normalizedEvent.date === 'object' && 
            !(normalizedEvent.date.jour && normalizedEvent.date.mois && normalizedEvent.date.annee)) {
          
          // Vérifier si la date est dans une propriété imbriquée
          if (normalizedEvent.date.date && typeof normalizedEvent.date.date === 'object') {
            normalizedEvent.date = normalizedEvent.date.date;
            console.log('Date récupérée depuis une propriété imbriquée:', normalizedEvent.date);
          }
        }
      }
      
      return normalizedEvent;
    });
  },
  
  async getAllEvents() {
    try {
      console.log(`Fetching events from: ${API_URL}/admin/events`);
      const response = await axios.get(`${API_URL}/admin/events`, {
        headers: authService.getAuthHeaders()
      });
      console.log('Events received (raw):', response.data);
      
      // Normaliser les données avant de les retourner
      const normalizedEvents = this._normalizeEventData(response.data);
      console.log('Events normalized:', normalizedEvents);
      
      return normalizedEvents;
    } catch (error) {
      console.error('Error fetching events:', error);
      // Ajouter des informations supplémentaires pour le débogage
      if (error.response) {
        // La requête a été faite et le serveur a répondu avec un code d'état
        // qui n'est pas dans la plage 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        console.error('No response received. Request details:', error.request);
      } else {
        // Une erreur s'est produite lors de la configuration de la requête
        console.error('Error setting up request:', error.message);
      }
      throw error;
    }
  },

  /**
   * Récupère un événement par son ID
   * @param {string} id ID de l'événement
   * @returns {Promise<Object>} Détails de l'événement
   */
  async getEventById(id) {
    try {
      const response = await axios.get(`${API_URL}/admin/events/${id}`, {
        headers: authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crée un nouvel événement
   * @param {Object} eventData Données de l'événement
   * @returns {Promise<Object>} Événement créé
   */
  async createEvent(eventData) {
    try {
      console.log('Données envoyées au serveur:', JSON.stringify(eventData, null, 2));
      
      // Vérifier si l'utilisateur est authentifié
      if (!authService.isAuthenticated()) {
        throw new Error('Vous devez être connecté pour créer un événement');
      }
      
      // Vérifier que tous les champs requis sont présents
      if (!eventData.titre) {
        console.error('Erreur: Le champ titre est manquant dans les données envoyées');
      }
      
      if (!eventData.description) {
        console.error('Erreur: Le champ description est manquant dans les données envoyées');
      }
      
      if (!eventData.horaire) {
        console.error('Erreur: Le champ horaire est manquant dans les données envoyées');
      }
      
      if (!eventData.lieu) {
        console.error('Erreur: Le champ lieu est manquant dans les données envoyées');
      }
      
      if (!eventData.date || !eventData.date.jour || !eventData.date.mois || !eventData.date.annee) {
        console.error('Erreur: Les champs de date sont incomplets', eventData.date);
      }
      
      if (!eventData.details || !eventData.details.destination) {
        console.error('Erreur: Les détails de l\'\u00e9vénement sont incomplets', eventData.details);
      }
      
      const response = await axios.post(`${API_URL}/admin/events`, eventData, {
        headers: authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  /**
   * Met à jour un événement existant
   * @param {string} id ID de l'événement
   * @param {Object} eventData Données mises à jour
   * @returns {Promise<Object>} Événement mis à jour
   */
  async updateEvent(id, eventData) {
    try {
      // Vérifier si l'utilisateur est authentifié
      if (!authService.isAuthenticated()) {
        throw new Error('Vous devez être connecté pour modifier un événement');
      }
      
      const response = await axios.put(`${API_URL}/admin/events/${id}`, eventData, {
        headers: authService.getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating event ${id}:`, error);
      throw error;
    }
  },

  /**
   * Supprime un événement
   * @param {string} id ID de l'événement à supprimer
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async deleteEvent(id) {
    try {
      // Vérifier si l'utilisateur est authentifié
      if (!authService.isAuthenticated()) {
        throw new Error('Vous devez être connecté pour supprimer un événement');
      }
      
      await axios.delete(`${API_URL}/admin/events/${id}`, {
        headers: authService.getAuthHeaders()
      });
      return true;
    } catch (error) {
      console.error(`Error deleting event ${id}:`, error);
      throw error;
    }
  }
};

export default eventService;
