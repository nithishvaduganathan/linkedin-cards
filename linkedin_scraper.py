import os
import json
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from dotenv import load_dotenv

load_dotenv()


class LinkedInScraper:
    def __init__(self):
        self.driver = None
        self.cookie = os.getenv('LINKEDIN_LI_AT_COOKIE')
        self.profile = None
        
    def start(self):
        """Inicia el navegador"""
        options = Options()
        options.add_argument('--log-level=3')
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        self.driver = webdriver.Chrome(options=options)
        
        # Agregar cookie si existe
        if self.cookie:
            self.driver.get('https://www.linkedin.com')
            time.sleep(1)
            self.driver.add_cookie({
                'name': 'li_at',
                'value': self.cookie,
                'domain': '.linkedin.com'
            })
            print("✓ Cookie agregada")
    
    def get_posts(self, url, max_posts=10):
        """Obtiene posts del perfil"""
        print(f"\nPosts: {url}/recent-activity/all/")
        self.driver.get(f"{url}/recent-activity/all/")
        time.sleep(5)
        
        # Extraer información del perfil desde el header de la página
        try:
            profile_name = self.driver.find_element(By.CSS_SELECTOR, 'div.break-words h3.single-line-truncate')
            self.profile = {'name': profile_name.text.strip()}
            
            profile_headline = self.driver.find_element(By.CSS_SELECTOR, 'div.break-words h4.t-14')
            self.profile['headline'] = profile_headline.text.strip()
            
            # Obtener la foto desde el primer post
            first_post = self.driver.find_element(By.CSS_SELECTOR, 'div.fie-impression-container')
            photo = first_post.find_element(By.CSS_SELECTOR, 'img.update-components-actor__avatar-image')
            self.profile['photo'] = photo.get_attribute('src')
            
            print(f"  Perfil: {self.profile['name']}")
        except:
            self.profile = {'name': None, 'photo': None, 'headline': None}
        
        # Scroll para cargar posts
        for i in range(3):
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
        
        posts = []
        try:
            elements = self.driver.find_elements(By.CSS_SELECTOR, 'div.fie-impression-container')
            print(f"  Encontrados: {len(elements)} elementos")
            
            for i, post in enumerate(elements):
                post_data = {}
                
                # Verificar si el autor del post es el dueño del perfil
                try:
                    author_name = post.find_element(By.CSS_SELECTOR, 'span.update-components-actor__title span[aria-hidden="true"]')
                    if author_name.text.strip() != self.profile['name']:
                        continue  # Saltar posts que no son del perfil
                except:
                    continue  # Saltar si no se puede verificar el autor
                
                # Enlace del post
                try:
                    # Buscar el div padre con data-urn
                    parent_div = post.find_element(By.XPATH, './ancestor::div[@data-urn]')
                    urn = parent_div.get_attribute('data-urn')
                    post_data['url'] = f"https://www.linkedin.com/feed/update/{urn}/"
                except Exception as e1:
                    if len(posts) == 0:
                        print(f"  DEBUG: Error extrayendo URN: {e1}")
                    post_data['url'] = ''
                
                # Texto del post
                try:
                    text_elem = post.find_element(By.CSS_SELECTOR, 'div.update-components-text')
                    post_data['text'] = text_elem.text.strip()
                except:
                    post_data['text'] = ''
                
                # Fecha (limpiar el texto extra)
                try:
                    date_elem = post.find_element(By.CSS_SELECTOR, 'span.update-components-actor__sub-description span[aria-hidden="true"]')
                    date_text = date_elem.text.strip()
                    # Extraer solo la parte de la fecha (ej: "2 semanas")
                    post_data['date'] = date_text.split('•')[0].strip()
                except:
                    post_data['date'] = ''
                
                # Imágenes
                try:
                    imgs = post.find_elements(By.CSS_SELECTOR, 'div.update-components-image img.update-components-image__image')
                    post_data['images'] = [img.get_attribute('src') for img in imgs]
                except:
                    post_data['images'] = []
                
                # Reacciones
                try:
                    # Buscar directamente el span con el número de reacciones
                    reactions_span = post.find_element(By.CSS_SELECTOR, 'span[data-social-proof-fallback]')
                    post_data['reactions'] = reactions_span.text.strip()
                except:
                    try:
                        # Intento alternativo con aria-label del botón
                        reactions_button = post.find_element(By.CSS_SELECTOR, 'button[data-reaction-details]')
                        aria = reactions_button.get_attribute('aria-label')
                        if aria:
                            import re
                            # Extraer números del aria-label
                            nums = re.findall(r'\d+', aria)
                            if nums:
                                # Si hay "X y Y personas más", el total es Y+1
                                if 'persona' in aria and len(nums) >= 2:
                                    post_data['reactions'] = str(int(nums[1]) + 1)
                                else:
                                    # Si dice "X reacciones", tomar el primer número
                                    post_data['reactions'] = nums[0]
                            else:
                                post_data['reactions'] = '0'
                        else:
                            post_data['reactions'] = '0'
                    except:
                        post_data['reactions'] = '0'
                
                # Comentarios
                try:
                    comments = post.find_element(By.CSS_SELECTOR, 'button[aria-label*="comentario"]')
                    # Extraer número del aria-label o del texto
                    aria = comments.get_attribute('aria-label')
                    if aria:
                        # Buscar números en el aria-label
                        import re
                        nums = re.findall(r'\d+', aria)
                        post_data['comments'] = nums[0] if nums else '0'
                    else:
                        post_data['comments'] = '0'
                except:
                    post_data['comments'] = '0'
                
                # Compartidos
                try:
                    shares = post.find_element(By.CSS_SELECTOR, 'button[aria-label*="compartid"]')
                    aria = shares.get_attribute('aria-label')
                    if aria:
                        import re
                        nums = re.findall(r'\d+', aria)
                        post_data['shares'] = nums[0] if nums else '0'
                    else:
                        post_data['shares'] = '0'
                except:
                    post_data['shares'] = '0'
                
                posts.append(post_data)
                
                # Detener si ya tenemos suficientes posts
                if len(posts) >= max_posts:
                    break
            
            print(f"  Posts del perfil: {len(posts)}")
            for i, post in enumerate(posts):
                print(f"  Post {i+1}: {post['date']} - {post['reactions']} reacciones, {post['comments']} comentarios, {post['shares']} compartidos")
                
        except Exception as e:
            print(f"  Error: {e}")
            
        return posts
    def save(self, data):
        """Guarda a JSON"""
        os.makedirs('output', exist_ok=True)
        with open('output/linkedin_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n✓ Guardado en output/linkedin_data.json")
        
    def close(self):
        """Cierra el navegador"""
        if self.driver:
            self.driver.quit()


def main():
    profile_url = os.getenv('LINKEDIN_PROFILE_URL', 'https://www.linkedin.com/in/alexcerezocontreras')
    
    scraper = LinkedInScraper()
    
    try:
        scraper.start()
        posts = scraper.get_posts(profile_url, max_posts=10)
        
        data = {
            'profile': scraper.profile or {'name': None, 'photo': None, 'headline': None},
            'posts': posts,
            'total': len(posts),
            'date': datetime.now().isoformat()
        }
        
        scraper.save(data)
        
    finally:
        scraper.close()


if __name__ == '__main__':
    main()
