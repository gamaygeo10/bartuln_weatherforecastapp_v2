import { Component, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { MenuController } from '@ionic/angular';
import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  currentWeather: any = null;
  currentForecast: any = null;
  searchQuery: string = '';
  searchedWeather: any = null;
  showModal: boolean = false;

  temperatureUnit: string = 'metric';
  enableAlerts: boolean = false;
  appTheme: string = 'light';

  isOnline: boolean = navigator.onLine;

  private apiKey: string = 'e14583782c69767317d8f2ca893345d8';
  private weatherUrl: string = 'https://api.openweathermap.org/data/2.5/weather';
  private forecastUrl: string = 'https://api.openweathermap.org/data/2.5/forecast';

  private countryCodeMap: { [key: string]: string } = {
    PH: 'Philippines', US: 'United States', CA: 'Canada', GB: 'United Kingdom',
    AU: 'Australia', IN: 'India', CN: 'China', JP: 'Japan', FR: 'France',
    DE: 'Germany', IT: 'Italy', ES: 'Spain', RU: 'Russia', BR: 'Brazil',
    MX: 'Mexico', ZA: 'South Africa', NG: 'Nigeria', EG: 'Egypt',
    AR: 'Argentina', CO: 'Colombia', KR: 'South Korea', VN: 'Vietnam',
    TH: 'Thailand', MY: 'Malaysia', SG: 'Singapore', ID: 'Indonesia',
    SA: 'Saudi Arabia', AE: 'United Arab Emirates', TR: 'Turkey',
    IR: 'Iran', PK: 'Pakistan', BD: 'Bangladesh',
  };

  constructor(private menuCtrl: MenuController) {
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.getWeatherForCurrentLocation();
    });
  }

  getCountryName(code: string): string {
    return this.countryCodeMap[code] || code;
  }

  async ngOnInit() {
    document.body.setAttribute('color-theme', this.appTheme);
    const cachedWeather = await Preferences.get({ key: 'currentWeather' });
    const cachedForecast = await Preferences.get({ key: 'currentForecast' });

    if (cachedWeather.value) this.currentWeather = JSON.parse(cachedWeather.value);
    if (cachedForecast.value) this.currentForecast = JSON.parse(cachedForecast.value);

    if (this.isOnline) {
      await this.getWeatherForCurrentLocation();
    }
  }

  async getWeatherForCurrentLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const lat = coordinates.coords.latitude;
      const lon = coordinates.coords.longitude;

      this.currentWeather = await this.getWeatherByCoords(lat, lon);
      await Preferences.set({ key: 'currentWeather', value: JSON.stringify(this.currentWeather) });

      this.currentForecast = await this.getForecastByCoords(lat, lon);
      await Preferences.set({ key: 'currentForecast', value: JSON.stringify(this.currentForecast) });
    } catch {
      const cachedWeather = await Preferences.get({ key: 'currentWeather' });
      const cachedForecast = await Preferences.get({ key: 'currentForecast' });
      if (cachedWeather.value) this.currentWeather = JSON.parse(cachedWeather.value);
      if (cachedForecast.value) this.currentForecast = JSON.parse(cachedForecast.value);
    }
  }

  async getWeatherByCoords(lat: number, lon: number) {
    try {
      const res = await axios.get(`${this.weatherUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.temperatureUnit}`);
      return res.data;
    } catch {
      return null;
    }
  }

  async getForecastByCoords(lat: number, lon: number) {
    try {
      const res = await axios.get(`${this.forecastUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.temperatureUnit}`);
      return res.data;
    } catch {
      return null;
    }
  }

  async getWeatherForSearch() {
    if (!this.searchQuery) return alert('Please enter a location.');
    try {
      const res = await axios.get(`${this.weatherUrl}?q=${this.searchQuery}&appid=${this.apiKey}&units=${this.temperatureUnit}`);
      this.searchedWeather = res.data;
      this.showModal = true;
    } catch {
      alert('Could not find weather for the specified location.');
    }
  }

  closeModal() {
    this.showModal = false;
  }

  toggleSettings() {
    this.menuCtrl.toggle('settingsMenu');
  }

  updateTemperatureUnit(unit: string) {
    this.temperatureUnit = unit;
    if (this.currentWeather) {
      const { lat, lon } = this.currentWeather.coord;
      this.getWeatherByCoords(lat, lon).then(data => this.currentWeather = data);
      this.getForecastByCoords(lat, lon).then(data => this.currentForecast = data);
    }
    if (this.searchedWeather) {
      const city = this.searchedWeather.name;
      axios.get(`${this.weatherUrl}?q=${city}&appid=${this.apiKey}&units=${unit}`)
        .then(res => this.searchedWeather = res.data)
        .catch(() => {});
    }
  }

  updateTheme(theme: string) {
    this.appTheme = theme;
    document.body.setAttribute('color-theme', theme);
  }

  updateAlerts(enable: boolean) {
    this.enableAlerts = enable;
    enable ? this.enableSevereWeatherNotifications() : this.disableSevereWeatherNotifications();
  }

  enableSevereWeatherNotifications() {
    this.showNotification('Severe Weather Alerts Enabled', 'You will now receive notifications for severe weather alerts.');
  }

  disableSevereWeatherNotifications() {
    this.showNotification('Severe Weather Alerts Disabled', 'You will no longer receive notifications for severe weather alerts.');
  }

  showNotification(title: string, message: string) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') new Notification(title, { body: message });
        });
      }
    }
  }
}
