# תהליך פריסה בטוח — DJ ATLANTIS

## מצב הפרויקט

- האתר הוא אתר סטטי של HTML, CSS ו־JavaScript. אין Framework, אין `package.json`, אין מנהל חבילות ואין פקודת Build.
- תיקיית הפרסום היחידה היא `netlify-deploy`.
- כל שינוי עתידי באתר מתבצע ונבדק בתוך `netlify-deploy`; קובצי אתר ישנים שנמצאים בשורש המאגר אינם חלק מהפרסום.
- ענף הייצור הוא `main`.
- Netlify עדיין אינו מחובר ל־GitHub. אין לחבר אותו לפני שהענף הזה נבדק, אושר ומוזג, אחרת `main` הישן עלול לפרסם אתר חלקי.
- תיקיית `netlify-deploy` בענף `chore/safe-netlify-deployment` סונכרנה מעותק שאומת כזהה לפריסת הייצור האחרונה. היא אינה כוללת שינויים מקומיים שטרם פורסמו.
- אין בפרויקט פקודת CLI לפריסת Production בכוונה. לאחר חיבור Git, פרסום ל־Production יתבצע רק ממיזוג מאושר ל־`main`.

## 1. יצירת ענף עבודה

לעולם אין לעבוד ישירות על `main`:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
```

לפני כל עבודה בודקים:

```powershell
git branch --show-current
git status --short
```

## 2. בדיקה מקומית

אין שלב Build. מריצים שרת סטטי מתוך תיקיית הפרסום:

```powershell
cd netlify-deploy
python -m http.server 4173 --bind 127.0.0.1
```

פותחים בדפדפן:

```text
http://127.0.0.1:4173/
```

יש לבדוק את העמודים ששונו במחשב ובטלפון, שאין גלילה אופקית, שכל הקישורים עובדים ושאין שגיאות בדפדפן.

## 3. שמירה ודחיפת הענף

```powershell
git status --short
git add <רק-הקבצים-שנבדקו>
git commit -m "תיאור קצר של השינוי"
git push -u origin HEAD
```

אין להשתמש ב־`git add .` בלי לבדוק את הרשימה. אין להעלות תיקיות `.netlify`, גיבויים, ZIP, דוחות, לוגים או קבצים זמניים.

## 4. פתיחת Pull Request

ב־GitHub פותחים Pull Request מענף העבודה אל `main`. אין להפעיל Auto-merge. בתיאור מציינים אילו עמודים השתנו, אילו בדיקות בוצעו ואילו שינויים נוספים מיועדים לאותה פריסת Production.

## 5. פתיחת Deploy Preview

לאחר חיבור GitHub ל־Netlify, כל Pull Request אל `main` יקבל Deploy Preview. הקישור ייראה כך:

```text
https://deploy-preview-<PR-number>--delightful-sunshine-f18b49.netlify.app
```

Preview אינו האתר החי. כתובת Production היא ורק היא `https://djatlantis.co.il`.

## 6. בדיקה ואישור

פותחים את ה־Deploy Preview ובודקים מחשב ומובייל. אם צריך תיקון, דוחפים אותו לאותו ענף ולאותו Pull Request. אין למזג עד שבעל האתר כתב אישור מפורש.

## 7. מיזוג מאושר ופריסת Production אחת

לאחר האישור בלבד ממזגים את ה־Pull Request אל `main` דרך GitHub. המיזוג המאושר ייצור פריסת Production אחת דרך חיבור Git של Netlify. אין לדחוף ישירות אל `main` ואין ליצור פריסת CLI נוספת.

## 8. קיבוץ כמה שינויים לפריסה אחת

כאשר יש כמה תיקונים קטנים:

1. מבצעים ובודקים אותם מקומית.
2. מרכזים אותם בענף וב־Pull Request אחד, או ממתינים עם כמה Pull Requests מאושרים.
3. נמנעים מדחיפה אחרי כל שינוי זעיר אם אין צורך ב־Preview חדש.
4. ממזגים ל־`main` פעם אחת, רק אחרי שכל השינויים הרצויים אושרו.

כל Push ל־Pull Request עשוי ליצור Preview חדש ולצרוך קרדיטים, לכן עדיף לבדוק ולקבץ מקומית לפני Push.

## 9. פקודות שאסור להפעיל בשגרה

```text
netlify deploy --prod
netlify deploy
netlify deploy --alias ...
git push origin main
git push --force
```

אין בפרויקט `deploy:production`: חיבור Git הוא מנגנון ה־Production היחיד. אין ליצור מנגנון CLI מקביל.

## 10. כאשר הקרדיטים ב־Netlify נמוכים

- עובדים ובודקים מקומית בלבד.
- מקבצים כמה תיקונים לפני Push כדי לצמצם Deploy Previews.
- משאירים Branch deploys כבויים.
- לא לוחצים Retry שוב ושוב על פריסה שנחסמה בגלל מכסה.
- לא משתמשים ב־Deploy Drop או ב־CLI.
- לא ממזגים ל־`main` עד שיש קרדיטים וכל השינויים אושרו.

## 11. הגדרות ידניות ב־GitHub

יש לבצע רק לאחר בדיקת הענף הזה:

1. פותחים `Settings` → `Rules` → `Rulesets` → `New ruleset` → `New branch ruleset`.
2. שם: `Protect production main`.
3. Target branches: ענף ברירת המחדל `main`.
4. Enforcement status: `Active`.
5. מפעילים `Require a pull request before merging`.
6. אם יש Reviewer נוסף, דורשים אישור אחד. אם בעל האתר הוא המשתמש היחיד, משאירים Required approvals על 0 ומבצעים את האישור המפורש לפני מיזוג ידני, מפני שמחבר Pull Request אינו יכול לאשר את עצמו.
7. חוסמים Force push ומחיקת הענף, ולא מגדירים Bypass קבוע.
8. אין להפעיל Auto-merge.

## 12. הגדרות ידניות ב־Netlify

יש לבצע רק אחרי שהאתר המלא בענף אושר ומוזג אל `main`:

1. פותחים `Project configuration` → `Build & deploy` → `Continuous deployment` → `Repository` → `Link repository`.
2. בוחרים GitHub ואת `muallemel-dot/dj-atlantis-site`.
3. Build settings: `Base directory` ריק, `Build command` ריק, `Publish directory` הוא `netlify-deploy`, ו־`Functions directory` ריק.
   הקובץ `netlify.toml` הוא מקור האמת להגדרת הפרסום; אחרי החיבור יש לוודא שהדשבורד מציג אותו ערך ולא לנהל ערך שונה במקביל.
4. פותחים `Branches and deploy contexts` → `Configure`.
5. Production branch: `main`.
6. Branch deploys: `None`.
7. Deploy Previews: מופעלים עבור Pull Requests אל `main`.
8. פותחים `Enforce deployment methods` → `Configure` ומפעילים Git-based production deployments. כך CLI ו־API יוכלו ליצור Preview אך לא לפרסם ישירות ל־Production.
9. בודקים שאין `Build hooks` מיותרים.
10. אין לשנות את הדומיין, DNS, חיוב או תוכנית המנוי.

## 13. זיהוי Preview לעומת Production

- Production: `https://djatlantis.co.il`.
- Deploy Preview: כתובת `netlify.app` שמתחילה ב־`deploy-preview-`.
- Branch preview, אם יופעל זמנית בעתיד: כתובת `netlify.app` עם שם הענף; היא אינה Production.

עד שהגדרות GitHub ו־Netlify יושלמו, ממשיכים בבדיקות מקומיות בלבד. אין לחבר את תיקיית העבודה הישנה ידנית לפרויקט Netlify ואין לבצע פריסת CLI.
