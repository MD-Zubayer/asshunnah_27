import asyncio
from django.core.management.base import BaseCommand
from mosques.models import Mosque
from playwright.async_api import async_playwright
from asgiref.sync import async_to_sync

async def scrape_and_save_mosques(query):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        search_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
        
        try:
            await page.goto(search_url, timeout=30000)
            await page.wait_for_timeout(4000)

            for _ in range(3):
                await page.mouse.wheel(0, 1000)
                await page.wait_for_timeout(1500)

            places = await page.evaluate('''() => {
                let items = document.querySelectorAll('div.Nv2PK');
                let results = [];
                items.forEach(item => {
                    let linkEl = item.querySelector('a.hfpxzc') || item.querySelector('a');
                    if (linkEl) {
                        let name = linkEl.getAttribute('aria-label');
                        let href = linkEl.getAttribute('href');
                        let latLngMatch = href ? href.match(/!3d([0-9.]+)!4d([0-9.]+)/) : null;
                        let lat = latLngMatch ? parseFloat(latLngMatch[1]) : null;
                        let lng = latLngMatch ? parseFloat(latLngMatch[2]) : null;
                        if (name && lat && lng) {
                            results.push({ name, latitude: lat, longitude: lng });
                        }
                    }
                });
                return results;
            }''')
        except Exception as e:
            print(f"Error scraping {query}: {e}")
            places = []

        await browser.close()
        return places

class Command(BaseCommand):
    help = 'Seeds database by scraping mosques using Playwright without API key'

    def handle(self, *args, **options):
        queries = [
            "Mosque in Mirpur Dhaka", 
            "Mosque in Dhanmondi Dhaka", 
            "Mosque in Gulshan Dhaka",
            "Mosque in Uttara Dhaka"
        ]
        
        for q in queries:
            self.stdout.write(f"Scraping for: {q}...")
            places = async_to_sync(scrape_and_save_mosques)(q)
            
            saved_count = 0
            for p in places:
                if p["latitude"] and p["longitude"]:
                    _, created = Mosque.objects.get_or_create(
                        name=p["name"],
                        latitude=p["latitude"],
                        longitude=p["longitude"],
                        defaults={"radius": 50}
                    )
                    if created:
                        saved_count += 1
            
            self.stdout.write(self.style.SUCCESS(f"Saved {saved_count} new mosques for '{q}'"))
            
        self.stdout.write(self.style.SUCCESS('Successfully completed Google Maps seeding.'))
